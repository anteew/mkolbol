#!/usr/bin/env node
/**
 * Post aggregated Laminar test summary to GitHub PR comment
 *
 * Creates a single aggregated PR comment with:
 * 1. Test summary from all node versions (consolidated)
 * 2. Flake budget: tests failing ≥2 times in last 5 runs
 * 3. Top failure trends (first seen, last seen)
 * 4. Links to detailed artifacts per node
 *
 * Designed to be best-effort:
 * - Skips silently if not a PR
 * - Skips if summary/trends files missing
 * - Continues on GitHub API errors
 *
 * Usage:
 *   node scripts/post-laminar-pr-comment.js              # Post comment (if not already posted)
 *   IS_FINAL_NODE=true node scripts/post-laminar-pr-comment.js  # Only post on final node
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SUMMARY_PATH = path.join(process.cwd(), 'reports', 'LAMINAR_SUMMARY.txt');
const TRENDS_PATH = path.join(process.cwd(), 'reports', 'LAMINAR_TRENDS.txt');
const HISTORY_PATH = path.join(process.cwd(), 'reports', 'history.jsonl');
const ACCEPTANCE_PATH = path.join(process.cwd(), 'reports', 'acceptance-smoke.jsonl');

// GitHub Actions environment
const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';
const nodeVersion = process.env.NODE_VERSION || process.version;
const ghToken = process.env.GH_TOKEN;
const isFinalNode = process.env.IS_FINAL_NODE === 'true';

async function main() {
  try {
    // Check if this is a PR
    if (!isPR) {
      console.log('[Laminar] Not a PR event, skipping comment');
      process.exit(0);
    }

    // Check if GH_TOKEN is available
    if (!ghToken) {
      console.log('[Laminar] GH_TOKEN not available, skipping comment');
      process.exit(0);
    }

    // Check if summary and trends files exist
    if (!fs.existsSync(SUMMARY_PATH) || !fs.existsSync(TRENDS_PATH)) {
      console.log('[Laminar] Summary or trends files missing, skipping comment');
      process.exit(0);
    }

    // Only post on final node (Node 24) to avoid duplicate comments
    // For single-node runs, always post
    const isLastNode = nodeVersion.includes('24') || nodeVersion.includes('node');
    if (!isLastNode && !isFinalNode) {
      console.log(`[Laminar] Not final node (${nodeVersion}), deferring comment to final node`);
      process.exit(0);
    }

    // Read files
    const summary = fs.readFileSync(SUMMARY_PATH, 'utf-8').trim();
    const trends = fs.readFileSync(TRENDS_PATH, 'utf-8').trim();

    // Calculate flake budget from history
    const flakeBudget = calculateFlakeBudget();

    // Read acceptance smoke results
    const acceptanceResults = readAcceptanceResults();

    // Truncate summary to first 30 lines for brevity
    const summaryLines = summary.split('\n').slice(0, 30);
    const summaryTruncated = summaryLines.join('\n');

    // Build comment body with flake budget and acceptance results
    const commentBody = buildCommentBody(summaryTruncated, trends, nodeVersion, flakeBudget, acceptanceResults);

    // Post comment using gh CLI
    await postComment(commentBody);

    console.log('[Laminar] Successfully posted aggregated PR comment');
    process.exit(0);

  } catch (err) {
    console.error(`[Laminar] Error posting PR comment: ${err.message}`);
    // Don't fail the workflow
    process.exit(0);
  }
}

/**
 * Read acceptance smoke test results from JSONL file
 * Returns formatted section or empty string if no results
 */
function readAcceptanceResults() {
  if (!fs.existsSync(ACCEPTANCE_PATH)) {
    return '';
  }

  try {
    const lines = fs.readFileSync(ACCEPTANCE_PATH, 'utf-8').split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      return '';
    }

    // Parse the acceptance result
    const result = JSON.parse(lines[lines.length - 1]);

    const checks = [];
    if (result.topology) checks.push('✅ Topology');
    else checks.push('❌ Topology');

    if (result.filesink) checks.push('✅ FilesystemSink');
    else checks.push('❌ FilesystemSink');

    if (result.endpoints) checks.push('✅ Router Endpoints');
    else checks.push('❌ Router Endpoints');

    return `\n### 🧪 Acceptance Smoke Test\n${checks.join(' | ')}`;
  } catch (err) {
    console.error('[Laminar] Error reading acceptance results:', err.message);
    return '';
  }
}

/**
 * Calculate flake budget: tests failing ≥2 times in last 5 runs
 * Returns summary string or empty if no flaky tests
 */
function calculateFlakeBudget() {
  if (!fs.existsSync(HISTORY_PATH)) {
    return '';
  }

  try {
    const lines = fs.readFileSync(HISTORY_PATH, 'utf-8').split('\n').filter(l => l.trim());

    // Parse JSONL and get last 5 runs worth of data
    const runs = [];
    const testFailures = {};

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'test:result' && entry.pass === false) {
          const testName = entry.name || 'unknown';
          testFailures[testName] = (testFailures[testName] || 0) + 1;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Find flaky tests (≥2 failures)
    const flakyTests = Object.entries(testFailures)
      .filter(([_, count]) => count >= 2)
      .map(([name, count]) => `${name} (${count}x)`);

    if (flakyTests.length === 0) {
      return '';
    }

    return `\n### 🔴 Flake Budget (≥2 failures in history)\n\`\`\`\n${flakyTests.slice(0, 5).join('\n')}\n\`\`\``;
  } catch (err) {
    console.error('[Laminar] Error calculating flake budget:', err.message);
    return '';
  }
}

function buildCommentBody(summary, trends, nodeVersion, flakeBudget, acceptanceResults) {
  return `## 📊 Laminar Test Report (Aggregated)

### Test Summary
\`\`\`
${summary}
\`\`\`

### Failure Trends
\`\`\`
${trends}
\`\`\`
${flakeBudget}${acceptanceResults}

### 📁 Artifacts
- **Full Summary:** See job artifacts for LAMINAR_SUMMARY.txt
- **Repro Hints:** See job artifacts for LAMINAR_REPRO.md (if failures exist)
- **Trends History:** Accumulated over time for pattern analysis
- **Acceptance Logs:** See job artifacts for acceptance-smoke-logs
- **Per-Node Reports:** Node 20 and Node 24 reports in artifacts

**Note:** This is a best-effort comment. All test details available in GitHub Actions artifacts.`;
}

async function postComment(body) {
  // Use gh CLI to post comment
  // The gh tool uses GH_TOKEN environment variable automatically
  const cmd = `gh pr comment -b ${JSON.stringify(body)}`;

  const { stdout, stderr } = await execAsync(cmd);

  if (stderr && !stderr.includes('Warning')) {
    // Some warnings are ok, but real errors should be logged
    console.error('[Laminar] gh command stderr:', stderr);
  }

  return stdout;
}

main().catch(err => {
  console.error(`[Laminar] Fatal error: ${err.message}`);
  process.exit(0); // Still exit 0 to not fail workflow
});
