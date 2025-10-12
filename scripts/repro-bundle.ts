#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';

interface SummaryEntry {
  status: string;
  duration: number;
  location: string;
  artifactURI: string;
  testName?: string;
  error?: string;
  timestamp?: string;
}

interface EventEntry {
  ts: number;
  lvl: string;
  case: string;
  phase?: string;
  evt: string;
  payload?: any;
  path?: string;
  id?: string;
  corr?: string;
}

interface ReproBundle {
  metadata: {
    bundleVersion: string;
    generated: string;
    testName: string;
    testFile: string;
    status: string;
    duration: number;
    timestamp?: string;
  };
  environment: {
    seed?: string;
    nodeVersion: string;
    platform: string;
    env?: Record<string, string>;
  };
  failure: {
    errorMessage?: string;
    errorEvents: EventEntry[];
    contextEvents: EventEntry[];
  };
  reproduction: {
    vitestCommand: string;
    logCommand: string;
    digestFile?: string;
  };
}

function extractTestName(artifactURI: string): string {
  const parts = artifactURI.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace('.jsonl', '').replace(/_/g, ' ');
}

function extractTestFile(location: string): string {
  return location.split(':')[0];
}

function extractCaseName(artifactURI: string): string {
  return artifactURI.replace('reports/', '').replace('.jsonl', '');
}

function readCaseEvents(artifactURI: string): EventEntry[] {
  if (!fs.existsSync(artifactURI)) return [];
  
  try {
    const content = fs.readFileSync(artifactURI, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

function extractFailureLogs(events: EventEntry[]): { errorEvents: EventEntry[], contextEvents: EventEntry[] } {
  const errorEvents: EventEntry[] = [];
  const contextEvents: EventEntry[] = [];
  
  // Find all error-level events
  for (const evt of events) {
    if (evt.lvl === 'error') {
      errorEvents.push(evt);
    }
  }
  
  // Extract context around errors (±5 events)
  const contextWindow = 5;
  const contextIndices = new Set<number>();
  
  for (const errorEvt of errorEvents) {
    const errorIdx = events.indexOf(errorEvt);
    if (errorIdx !== -1) {
      const start = Math.max(0, errorIdx - contextWindow);
      const end = Math.min(events.length - 1, errorIdx + contextWindow);
      
      for (let i = start; i <= end; i++) {
        contextIndices.add(i);
      }
    }
  }
  
  // Collect context events
  for (const idx of Array.from(contextIndices).sort((a, b) => a - b)) {
    contextEvents.push(events[idx]);
  }
  
  return { errorEvents, contextEvents };
}

function generateReproBundle(failure: SummaryEntry): ReproBundle {
  const testFile = extractTestFile(failure.location);
  const testName = failure.testName || extractTestName(failure.artifactURI);
  const caseName = extractCaseName(failure.artifactURI);
  
  // Read all events from case file
  const events = readCaseEvents(failure.artifactURI);
  
  // Extract failure-relevant logs
  const { errorEvents, contextEvents } = extractFailureLogs(events);
  
  // Check for digest file
  let digestFile: string | undefined;
  const digestPath = failure.artifactURI.replace('.jsonl', '.digest.md');
  if (fs.existsSync(digestPath)) {
    digestFile = digestPath;
  }
  
  // Build reproduction commands
  const vitestCommand = `vitest run --reporter=verbose --pool=threads "${testFile}" -t "${testName}"`;
  const logCommand = `npm run logq -- ${failure.artifactURI}`;
  
  // Extract environment (look for seed in events or use default)
  let seed: string | undefined;
  const envVars: Record<string, string> = {};
  
  for (const evt of events) {
    if (evt.payload && typeof evt.payload === 'object') {
      if ('seed' in evt.payload) {
        seed = String(evt.payload.seed);
      }
      if ('env' in evt.payload && typeof evt.payload.env === 'object') {
        Object.assign(envVars, evt.payload.env);
      }
    }
  }
  
  const bundle: ReproBundle = {
    metadata: {
      bundleVersion: '1.0.0',
      generated: new Date().toISOString(),
      testName,
      testFile,
      status: failure.status,
      duration: failure.duration,
      timestamp: failure.timestamp,
    },
    environment: {
      seed: seed || process.env.TEST_SEED,
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      env: Object.keys(envVars).length > 0 ? envVars : undefined,
    },
    failure: {
      errorMessage: failure.error,
      errorEvents,
      contextEvents,
    },
    reproduction: {
      vitestCommand,
      logCommand,
      digestFile,
    },
  };
  
  return bundle;
}

function generateMarkdownSummary(bundle: ReproBundle): string {
  const md: string[] = [];
  
  md.push(`# Reproduction Bundle: ${bundle.metadata.testName}`);
  md.push('');
  md.push(`**Generated:** ${bundle.metadata.generated}`);
  md.push(`**Status:** ${bundle.metadata.status.toUpperCase()}`);
  md.push(`**Duration:** ${bundle.metadata.duration}ms`);
  md.push(`**Test File:** ${bundle.metadata.testFile}`);
  md.push('');
  
  md.push('## Environment');
  md.push('');
  md.push(`- **Seed:** ${bundle.environment.seed || 'none'}`);
  md.push(`- **Node:** ${bundle.environment.nodeVersion}`);
  md.push(`- **Platform:** ${bundle.environment.platform}`);
  if (bundle.environment.env) {
    md.push(`- **Environment Variables:**`);
    for (const [key, value] of Object.entries(bundle.environment.env)) {
      md.push(`  - ${key}=${value}`);
    }
  }
  md.push('');
  
  md.push('## Failure Summary');
  md.push('');
  if (bundle.failure.errorMessage) {
    md.push('**Error:**');
    md.push('```');
    md.push(bundle.failure.errorMessage);
    md.push('```');
    md.push('');
  }
  
  if (bundle.failure.errorEvents.length > 0) {
    md.push(`**Error Events:** ${bundle.failure.errorEvents.length}`);
    md.push('');
    for (const evt of bundle.failure.errorEvents.slice(0, 3)) {
      md.push(`- **${evt.evt}** (${new Date(evt.ts).toISOString()})`);
      if (evt.payload?.message) {
        md.push(`  - ${evt.payload.message}`);
      }
    }
    md.push('');
  }
  
  md.push('## Reproduction Commands');
  md.push('');
  md.push('**Run test:**');
  md.push('```bash');
  md.push(bundle.reproduction.vitestCommand);
  md.push('```');
  md.push('');
  md.push('**View logs:**');
  md.push('```bash');
  md.push(bundle.reproduction.logCommand);
  md.push('```');
  md.push('');
  
  if (bundle.reproduction.digestFile) {
    md.push('**Digest file:**');
    md.push(`\`${bundle.reproduction.digestFile}\``);
    md.push('');
  }
  
  md.push('## Context Events');
  md.push('');
  md.push(`**Total context events:** ${bundle.failure.contextEvents.length}`);
  md.push('');
  md.push('_See JSON bundle for full event details_');
  md.push('');
  
  return md.join('\n');
}

export async function bundleRepro(caseName?: string): Promise<void> {
  const summaryPath = path.join(process.cwd(), 'reports/summary.jsonl');
  
  if (!fs.existsSync(summaryPath)) {
    console.error('No summary.jsonl found. Run tests first.');
    process.exit(1);
  }
  
  const content = fs.readFileSync(summaryPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const entries: SummaryEntry[] = lines.map(line => JSON.parse(line));
  
  const failures = entries.filter(entry => entry.status === 'fail');
  
  if (failures.length === 0) {
    console.log('✓ No failures to bundle');
    process.exit(0);
  }
  
  // Filter to specific case if requested
  let targetFailures = failures;
  if (caseName) {
    targetFailures = failures.filter(f => {
      const cn = extractCaseName(f.artifactURI);
      return cn === caseName || cn.includes(caseName);
    });
    
    if (targetFailures.length === 0) {
      console.error(`No failure found matching: ${caseName}`);
      process.exit(1);
    }
  }
  
  // Create bundles directory
  const bundlesDir = path.join(process.cwd(), 'reports/bundles');
  fs.mkdirSync(bundlesDir, { recursive: true });
  
  console.log(`\n=== Generating Repro Bundles (${targetFailures.length} failure${targetFailures.length > 1 ? 's' : ''}) ===\n`);
  
  for (const failure of targetFailures) {
    const cn = extractCaseName(failure.artifactURI);
    const bundle = generateReproBundle(failure);
    const markdown = generateMarkdownSummary(bundle);
    
    // Write JSON bundle
    const jsonPath = path.join(bundlesDir, `${cn}.repro.json`);
    const jsonDir = path.dirname(jsonPath);
    fs.mkdirSync(jsonDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(bundle, null, 2));
    
    // Write Markdown summary
    const mdPath = path.join(bundlesDir, `${cn}.repro.md`);
    const mdDir = path.dirname(mdPath);
    fs.mkdirSync(mdDir, { recursive: true });
    fs.writeFileSync(mdPath, markdown);
    
    console.log(`✓ ${cn}`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  MD:   ${mdPath}`);
    console.log('');
  }
  
  console.log(`✓ Generated ${targetFailures.length} bundle${targetFailures.length > 1 ? 's' : ''} in reports/bundles/`);
}

// CLI entry point
import { fileURLToPath } from 'node:url';
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const caseName = process.argv[2];
  bundleRepro(caseName).catch(err => {
    console.error('Error generating bundles:', err);
    process.exit(1);
  });
}
