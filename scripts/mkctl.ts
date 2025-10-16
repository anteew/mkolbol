#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Kernel } from '../src/kernel/Kernel.js';
import { Hostess } from '../src/hostess/Hostess.js';
import { StateManager } from '../src/state/StateManager.js';
import { Executor } from '../src/executor/Executor.js';
import { loadConfig } from '../src/config/loader.js';

const EXIT_CODES = {
  SUCCESS: 0,
  USAGE: 64,
  CONFIG_PARSE: 65,
  CONFIG_NOT_FOUND: 66,
  RUNTIME: 70,
  INTERRUPTED: 130,
} as const;

class MkctlError extends Error {
  constructor(message: string, public readonly code: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MkctlError';
  }
}

function logError(message: string): void {
  console.error(`[mkctl] ${message}`);
}

function handleException(err: unknown): number {
  if (err instanceof MkctlError) {
    logError(err.message);
    return err.code;
  }

  if (err instanceof Error) {
    logError(`Unexpected error: ${err.message}`);
  } else {
    logError(`Unexpected error: ${String(err)}`);
  }

  return EXIT_CODES.RUNTIME;
}

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
      try {
        const exitCode = await handleRunCommand(process.argv.slice(3));
        process.exit(exitCode);
      } catch (err: unknown) {
        const code = handleException(err);
        process.exit(code);
      }
      return;
    }
    default:
      printHelp();
      if (cmd) {
        logError(`Unknown command: ${cmd}`);
        process.exit(EXIT_CODES.USAGE);
      }
      return;
  }
}

main().catch(e => {
  const code = handleException(e);
  process.exit(code);
});

interface RunArguments {
  configPath: string;
  durationMs: number;
}

function parseRunArgs(args: string[]): RunArguments {
  let configPath: string | undefined;
  let durationMs = 5000;

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--file') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new MkctlError('Usage: mkctl run --file <path> [--duration <seconds>]', EXIT_CODES.USAGE);
      }
      configPath = next;
      i++;
    } else if (token === '--duration') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new MkctlError('Usage: mkctl run --file <path> [--duration <seconds>]', EXIT_CODES.USAGE);
      }
      const parsed = Number.parseInt(next, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new MkctlError('Duration must be a positive integer (seconds).', EXIT_CODES.USAGE);
      }
      durationMs = parsed * 1000;
      i++;
    }
  }

  if (!configPath) {
    throw new MkctlError('Usage: mkctl run --file <path> [--duration <seconds>]', EXIT_CODES.USAGE);
  }

  return { configPath, durationMs };
}

async function waitForDurationOrSignal(durationMs: number): Promise<'timer' | 'signal'> {
  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
    };

    const onSignal = (signal: NodeJS.Signals) => {
      if (settled) return;
      settled = true;
      console.log(`\nReceived ${signal}. Shutting down...`);
      clearTimeout(timer);
      cleanup();
      resolve('signal');
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve('timer');
    }, durationMs);

    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
  });
}

async function handleRunCommand(args: string[]): Promise<number> {
  const { configPath, durationMs } = parseRunArgs(args);

  try {
    await fs.access(configPath);
  } catch {
    throw new MkctlError(
      `Config file not found: ${configPath}\nHint: confirm the path or pick one from examples/configs.`,
      EXIT_CODES.CONFIG_NOT_FOUND
    );
  }

  console.log(`Loading config from: ${configPath}`);

  let config;
  try {
    config = loadConfig(configPath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const validationIndicators = [
      'Configuration must',
      'Duplicate node id',
      'address "',
      'node "',
      '"nodes" must be an array',
      '"connections" must be an array'
    ];
    const isValidationIssue = validationIndicators.some(pattern => message.includes(pattern));
    if (isValidationIssue) {
      throw new MkctlError(
        `Configuration validation failed: ${message}\nHint: ensure nodes[] and connections[] are defined with unique IDs.`,
        EXIT_CODES.CONFIG_PARSE,
        { cause: err }
      );
    }
    throw new MkctlError(
      `Failed to read config ${configPath}: ${message}\nHint: validate that the file contains well-formed YAML or JSON.`,
      EXIT_CODES.CONFIG_PARSE,
      { cause: err }
    );
  }

  const kernel = new Kernel();
  const hostess = new Hostess();
  const stateManager = new StateManager(kernel);
  const executor = new Executor(kernel, hostess, stateManager);

  try {
    executor.load(config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new MkctlError(
      `Configuration validation failed: ${message}\nHint: ensure nodes[] and connections[] are defined with unique IDs.`,
      EXIT_CODES.CONFIG_PARSE,
      { cause: err }
    );
  }

  console.log('Bringing topology up...');
  try {
    await executor.up();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new MkctlError(
      `Failed to start topology: ${message}\nHint: verify module names and external commands referenced by the config.`,
      EXIT_CODES.RUNTIME,
      { cause: err }
    );
  }

  console.log(`Topology running for ${durationMs / 1000} seconds...\n`);

  const outcome = await waitForDurationOrSignal(durationMs);

  console.log('\nBringing topology down...');
  try {
    await executor.down();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new MkctlError(
      `Failed while shutting down topology: ${message}\nHint: inspect module shutdown hooks or external process logs.`,
      EXIT_CODES.RUNTIME,
      { cause: err }
    );
  }

  if (outcome === 'signal') {
    console.log('Interrupted.');
    return EXIT_CODES.INTERRUPTED;
  }

  console.log('Done.');
  return EXIT_CODES.SUCCESS;
}
