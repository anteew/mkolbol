#!/usr/bin/env node
/**
 * Post Laminar test summary to GitHub PR comment
 *
 * Creates a PR comment with:
 * 1. Test summary snapshot from current run
 * 2. Top failure trends (first seen, last seen)
 * 3. Links to detailed artifacts
 *
 * Designed to be best-effort:
 * - Skips silently if not a PR
 * - Skips if summary/trends files missing
 * - Continues on GitHub API errors
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SUMMARY_PATH = path.join(process.cwd(), 'reports', 'LAMINAR_SUMMARY.txt');
const TRENDS_PATH = path.join(process.cwd(), 'reports', 'LAMINAR_TRENDS.txt');

// GitHub Actions environment
const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';
const nodeVersion = process.env.NODE_VERSION || process.version;
const ghToken = process.env.GH_TOKEN;

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

    // Read files
    const summary = fs.readFileSync(SUMMARY_PATH, 'utf-8').trim();
    const trends = fs.readFileSync(TRENDS_PATH, 'utf-8').trim();

    // Truncate summary to first 30 lines for brevity
    const summaryLines = summary.split('\n').slice(0, 30);
    const summaryTruncated = summaryLines.join('\n');

    // Build comment body
    const commentBody = buildCommentBody(summaryTruncated, trends, nodeVersion);

    // Post comment using gh CLI
    await postComment(commentBody);

    console.log('[Laminar] Successfully posted PR comment');
    process.exit(0);

  } catch (err) {
    console.error(`[Laminar] Error posting PR comment: ${err.message}`);
    // Don't fail the workflow
    process.exit(0);
  }
}

function buildCommentBody(summary, trends, nodeVersion) {
  return `## 📊 Laminar Test Report (Node ${nodeVersion})

### Test Summary
\`\`\`
${summary}
\`\`\`

### Failure Trends
\`\`\`
${trends}
\`\`\`

### 📁 Artifacts
- **Full Summary:** See job artifacts for LAMINAR_SUMMARY.txt
- **Repro Hints:** See job artifacts for LAMINAR_REPRO.md (if failures exist)
- **Trends History:** Accumulated over time for pattern analysis

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
