#!/usr/bin/env node
// Minimal CLI stub to satisfy smoke tests and provide guidance.
// This project’s primary CLI for human use is `mkctl` (dist/scripts/mkctl.js)
// and tooling is modular. The `lam` name remains for compatibility.

const args = process.argv.slice(2);

function printHelp() {
  console.log(`lam — minimal stub CLI\n\n` +
    `Usage:\n` +
    `  lam --help           Show this help\n` +
    `  lam version          Show package version\n\n` +
    `Notes:\n` +
    `  - This repository no longer bundles the Laminar toolkit.\n` +
    `  - For kernel demos, use: node dist/examples/*.js\n` +
    `  - For registry endpoints, use: node dist/scripts/mkctl.js endpoints\n`);
}

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (args[0] === 'version' || args[0] === '--version' || args[0] === '-v') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../package.json');
    console.log(pkg.version || 'unknown');
  } catch {
    console.log('unknown');
  }
  process.exit(0);
}

printHelp();
process.exit(0);

