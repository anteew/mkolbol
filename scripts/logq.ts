#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';

interface LogEntry {
  ts?: number;
  lvl?: string;
  case?: string;
  phase?: string;
  evt?: string;
  id?: string;
  corr?: string;
  path?: string;
  payload?: unknown;
  [key: string]: unknown;
}

interface FilterSpec {
  field: string;
  pattern: RegExp | string;
}

interface Options {
  filters: FilterSpec[];
  around?: string;
  window?: number;
  raw: boolean;
  help: boolean;
  filePath: string;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    filters: [],
    raw: false,
    help: false,
    filePath: '',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--raw') {
      options.raw = true;
    } else if (arg === '--around') {
      options.around = args[++i];
    } else if (arg === '--window') {
      options.window = parseInt(args[++i], 10);
    } else if (arg.includes('=')) {
      const [field, value] = arg.split('=', 2);
      const pattern = value.startsWith('/') && value.endsWith('/')
        ? new RegExp(value.slice(1, -1))
        : value;
      options.filters.push({ field, pattern });
    } else if (!arg.startsWith('-')) {
      if (options.filePath) {
        options.filters.push({ field: 'evt', pattern: arg });
      } else {
        options.filePath = arg;
      }
    }
  }

  return options;
}

function matchesFilter(entry: LogEntry, filter: FilterSpec): boolean {
  const value = entry[filter.field];
  if (value === undefined) return false;

  const strValue = String(value);
  if (filter.pattern instanceof RegExp) {
    return filter.pattern.test(strValue);
  }
  return strValue === filter.pattern;
}

function matchesAllFilters(entry: LogEntry, filters: FilterSpec[]): boolean {
  if (filters.length === 0) return true;
  return filters.every(filter => matchesFilter(entry, filter));
}

function formatCompact(entry: LogEntry): string {
  const ts = entry.ts ? new Date(entry.ts).toISOString() : '???';
  const lvl = entry.lvl || '?';
  const caseName = entry.case || '?';
  const evt = entry.evt || '?';
  const phase = entry.phase ? `[${entry.phase}]` : '';
  const corr = entry.corr ? `corr=${entry.corr}` : '';
  const path = entry.path ? `@${entry.path}` : '';
  const extra = [phase, corr, path].filter(Boolean).join(' ');
  
  return `${ts} ${lvl.padEnd(5)} ${caseName} ${evt} ${extra}`.trim();
}

function processJsonlFile(filePath: string, options: Options): void {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  const entries: LogEntry[] = lines.map(line => JSON.parse(line));

  let filtered = entries.filter(entry => matchesAllFilters(entry, options.filters));

  if (options.around) {
    const [field, value] = options.around.split('=', 2);
    const centerIdx = filtered.findIndex(entry => String(entry[field]) === value);
    
    if (centerIdx !== -1) {
      const windowSize = options.window || 5;
      const start = Math.max(0, centerIdx - windowSize);
      const end = Math.min(filtered.length, centerIdx + windowSize + 1);
      filtered = filtered.slice(start, end);
    } else {
      filtered = [];
    }
  }

  for (const entry of filtered) {
    if (options.raw) {
      console.log(JSON.stringify(entry));
    } else {
      console.log(formatCompact(entry));
    }
  }
}

function showHelp(): void {
  console.log(`
logq - Query JSONL logs with filters and windows

USAGE:
  npm run logq -- [OPTIONS] [FILTERS...] <file>

FILTERS:
  field=value      Match exact value (e.g., case=demo.case, evt=case.begin)
  field=/regex/    Match regex pattern (e.g., evt=/test.*/)
  value            Shorthand for evt=value (e.g., failures)

OPTIONS:
  --around field=value   Show lines around a matching entry
  --window N             Window size for --around (default: 5)
  --raw                  Output raw JSONL instead of compact format
  --help, -h             Show this help

EXAMPLES:
  # Filter by case name
  npm run logq -- case=demo.case reports/demo/demo.case.jsonl

  # Filter by event type with regex
  npm run logq -- evt=/case.*/ reports/demo/demo.case.jsonl

  # Show context around a correlation ID
  npm run logq -- --around corr=abc123 --window 3 reports/demo/demo.case.jsonl

  # Multiple filters
  npm run logq -- case=demo.case evt=test.step reports/demo/demo.case.jsonl

  # Output raw JSONL
  npm run logq -- --raw evt=case.begin reports/demo/demo.case.jsonl
`.trim());
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.filePath) {
    console.error('Error: No input file specified');
    showHelp();
    process.exit(1);
  }

  try {
    processJsonlFile(options.filePath, options);
  } catch (err) {
    console.error(`Error processing file: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
