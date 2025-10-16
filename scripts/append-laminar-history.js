#!/usr/bin/env node
/**
 * Append test results from summary.jsonl to history.jsonl for trends accumulation
 *
 * This script:
 * 1. Reads reports/summary.jsonl (per-run results)
 * 2. Filters out environment and metadata entries (keep only test results)
 * 3. Appends to reports/history.jsonl for persistent trends analysis
 * 4. Preserves historical data across CI runs via caching
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUMMARY_PATH = path.join(process.cwd(), 'reports', 'summary.jsonl');
const HISTORY_PATH = path.join(process.cwd(), 'reports', 'history.jsonl');

try {
  // Check if summary.jsonl exists
  if (!fs.existsSync(SUMMARY_PATH)) {
    console.log('[Laminar] No summary.jsonl found, skipping history append');
    process.exit(0);
  }

  // Read summary.jsonl
  const summaryContent = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  const lines = summaryContent.trim().split('\n').filter(line => line.length > 0);

  // Filter to only test result lines (skip environment and metadata)
  const testResults = lines.filter(line => {
    try {
      const obj = JSON.parse(line);
      // Skip non-test entries (environment, metadata)
      return obj.status && (obj.status === 'pass' || obj.status === 'fail' || obj.status === 'skip');
    } catch {
      return false;
    }
  });

  if (testResults.length === 0) {
    console.log('[Laminar] No test results to append to history');
    process.exit(0);
  }

  // Append to history.jsonl (preserve existing content)
  const historyStream = fs.createWriteStream(HISTORY_PATH, { flags: 'a' });

  for (const line of testResults) {
    historyStream.write(line + '\n');
  }

  historyStream.end();

  historyStream.on('finish', () => {
    console.log(`[Laminar] Appended ${testResults.length} test results to ${HISTORY_PATH}`);
    process.exit(0);
  });

  historyStream.on('error', (err) => {
    console.error(`[Laminar] Failed to append history: ${err.message}`);
    process.exit(1);
  });

} catch (err) {
  console.error(`[Laminar] Error: ${err.message}`);
  process.exit(1);
}
