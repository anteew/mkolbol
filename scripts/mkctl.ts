#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Kernel } from '../src/kernel/Kernel.js';
import { Hostess } from '../src/hostess/Hostess.js';
import { StateManager } from '../src/state/StateManager.js';
import { Executor } from '../src/executor/Executor.js';
import { loadConfig } from '../src/config/loader.js';

function printHelp() {
  console.log(`mkctl - Microkernel Control CLI

USAGE
  mkctl <command>

COMMANDS
  endpoints    List all registered endpoints with type and coordinates
  run          Execute topology from config file

EXAMPLES
  mkctl endpoints
  mkctl run --file examples/configs/basic.yml
  mkctl run --file config.yml --duration 10

LEARN MORE
  Documentation: https://github.com/anteew/mkolbol
`);
}

async function main() {
  const [,, cmd] = process.argv;

  switch (cmd) {
    case 'endpoints': {
      const snapshotPath = path.resolve(process.cwd(), 'reports', 'endpoints.json');
      
      let endpoints: Array<{ id: string; type: string; coordinates: string; metadata?: Record<string, any> }>;
      try {
        const data = await fs.readFile(snapshotPath, 'utf-8');
        endpoints = JSON.parse(data);
      } catch (err) {
        console.log('No endpoints registered.');
        break;
      }

      if (endpoints.length === 0) {
        console.log('No endpoints registered.');
        break;
      }

      console.log('Registered Endpoints:');
      console.log('');

      for (const endpoint of endpoints) {
        console.log(`ID:          ${endpoint.id}`);
        console.log(`Type:        ${endpoint.type}`);
        console.log(`Coordinates: ${endpoint.coordinates}`);
        if (endpoint.metadata?.ioMode) {
          console.log(`IO Mode:     ${endpoint.metadata.ioMode}`);
        }
        if (endpoint.metadata && Object.keys(endpoint.metadata).length > 0) {
          console.log(`Metadata:    ${JSON.stringify(endpoint.metadata)}`);
        }
        console.log('');
      }
      break;
    }
    case 'run': {
      const args = process.argv.slice(3);
      const fileIndex = args.indexOf('--file');
      const durationIndex = args.indexOf('--duration');
      
      if (fileIndex === -1 || fileIndex === args.length - 1) {
        console.error('Usage: mkctl run --file <path> [--duration <seconds>]');
        process.exit(1);
      }
      
      const configPath = args[fileIndex + 1];
      const duration = durationIndex !== -1 && durationIndex < args.length - 1
        ? parseInt(args[durationIndex + 1], 10) * 1000
        : 5000;
      
      console.log(`Loading config from: ${configPath}`);
      const config = loadConfig(configPath);
      
      const kernel = new Kernel();
      const hostess = new Hostess();
      const stateManager = new StateManager(kernel);
      const executor = new Executor(kernel, hostess, stateManager);
      
      executor.load(config);
      
      console.log('Bringing topology up...');
      await executor.up();
      
      console.log(`Topology running for ${duration / 1000} seconds...\n`);
      
      await new Promise(resolve => setTimeout(resolve, duration));
      
      console.log('\nBringing topology down...');
      await executor.down();
      
      console.log('Done.');
      process.exit(0);
    }
    default:
      printHelp();
      if (cmd) {
        console.error(`\nUnknown command: ${cmd}`);
        process.exit(1);
      }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
