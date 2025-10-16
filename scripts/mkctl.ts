#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Kernel } from '../src/kernel/Kernel.js';
import { Hostess } from '../src/hostess/Hostess.js';
import { StateManager } from '../src/state/StateManager.js';
import { Executor } from '../src/executor/Executor.js';
import { loadConfig } from '../src/config/loader.js';
import { RoutingServer } from '../src/router/RoutingServer.js';
import type { RoutingEndpoint } from '../src/types.js';

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
  mkctl endpoints --watch
  mkctl endpoints --filter type=inproc
  mkctl endpoints --watch --filter type=worker --interval 2
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
      await handleEndpointsCommand(process.argv.slice(3));
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
  snapshotIntervalMs?: number;
}

function parseRunArgs(args: string[]): RunArguments {
  let configPath: string | undefined;
  let durationMs = 5000;
  let snapshotIntervalMs: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--file') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new MkctlError('Usage: mkctl run --file <path> [--duration <seconds>] [--snapshot-interval <seconds>]', EXIT_CODES.USAGE);
      }
      configPath = next;
      i++;
    } else if (token === '--duration') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new MkctlError('Usage: mkctl run --file <path> [--duration <seconds>] [--snapshot-interval <seconds>]', EXIT_CODES.USAGE);
      }
      const parsed = Number.parseInt(next, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new MkctlError('Duration must be a positive integer (seconds).', EXIT_CODES.USAGE);
      }
      durationMs = parsed * 1000;
      i++;
    } else if (token === '--snapshot-interval') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new MkctlError('--snapshot-interval requires a number (seconds)', EXIT_CODES.USAGE);
      }
      const parsed = Number.parseInt(next, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new MkctlError('--snapshot-interval must be a positive integer (seconds)', EXIT_CODES.USAGE);
      }
      snapshotIntervalMs = parsed * 1000;
      i++;
    }
  }

  if (!configPath) {
    throw new MkctlError('Usage: mkctl run --file <path> [--duration <seconds>] [--snapshot-interval <seconds>]', EXIT_CODES.USAGE);
  }

  return { configPath, durationMs, snapshotIntervalMs };
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

type EndpointSnapshot = {
  id: string;
  type: string;
  coordinates: string;
  metadata?: Record<string, any>;
  announcedAt?: number;
  updatedAt?: number;
};

async function loadEndpointSnapshot(): Promise<{ endpoints: EndpointSnapshot[]; source: 'router' | 'hostess' }> {
  const routerSnapshotPath = path.resolve(process.cwd(), 'reports', 'router-endpoints.json');
  try {
    const raw = await fs.readFile(routerSnapshotPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const endpoints = parsed.map(normalizeRouterEndpoint);
      return { endpoints, source: 'router' };
    }
  } catch {
    // fall through to hostess snapshot
  }

  const hostessSnapshotPath = path.resolve(process.cwd(), 'reports', 'endpoints.json');
  try {
    const raw = await fs.readFile(hostessSnapshotPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const endpoints = parsed.map((entry: any) => normalizeRouterEndpoint({
        id: entry.id,
        type: entry.type,
        coordinates: entry.coordinates,
        metadata: entry.metadata,
        announcedAt: entry.announcedAt,
        updatedAt: entry.updatedAt,
      }));
      return { endpoints, source: 'hostess' };
    }
  } catch {
    // ignore
  }

  return { endpoints: [], source: 'router' };
}

function normalizeRouterEndpoint(entry: any): EndpointSnapshot {
  return {
    id: String(entry?.id ?? ''),
    type: String(entry?.type ?? 'unknown'),
    coordinates: String(entry?.coordinates ?? ''),
    metadata: entry && typeof entry.metadata === 'object' ? entry.metadata : undefined,
    announcedAt: typeof entry?.announcedAt === 'number' ? entry.announcedAt : undefined,
    updatedAt: typeof entry?.updatedAt === 'number' ? entry.updatedAt : undefined,
  };
}

function formatTimestamp(value?: number): string {
  if (value === undefined || value === null) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toISOString();
}

interface EndpointsArguments {
  watch: boolean;
  interval: number;
  filters: Array<{ key: string; value: string }>;
  json: boolean;
}

function parseEndpointsArgs(args: string[]): EndpointsArguments {
  let watch = false;
  let interval = 1;
  let json = false;
  const filters: Array<{ key: string; value: string }> = [];

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--watch') {
      watch = true;
    } else if (token === '--interval') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new MkctlError('--interval requires a number (seconds)', EXIT_CODES.USAGE);
      }
      const parsed = Number.parseInt(next, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new MkctlError('--interval must be a positive integer', EXIT_CODES.USAGE);
      }
      interval = parsed;
      i++;
    } else if (token === '--filter') {
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new MkctlError('--filter requires key=value format', EXIT_CODES.USAGE);
      }
      const parts = next.split('=');
      if (parts.length !== 2) {
        throw new MkctlError('--filter requires key=value format', EXIT_CODES.USAGE);
      }
      filters.push({ key: parts[0], value: parts[1] });
      i++;
    } else if (token === '--json') {
      json = true;
    }
  }

  return { watch, interval, filters, json };
}

function applyFilters(endpoints: EndpointSnapshot[], filters: Array<{ key: string; value: string }>): EndpointSnapshot[] {
  if (filters.length === 0) return endpoints;

  return endpoints.filter((endpoint) => {
    for (const { key, value } of filters) {
      if (key === 'type' && endpoint.type !== value) return false;
      if (key === 'id' && !endpoint.id.includes(value)) return false;
      if (key === 'coordinates' && !endpoint.coordinates.includes(value)) return false;
      
      if (key.startsWith('metadata.')) {
        const metaKey = key.substring(9);
        if (!endpoint.metadata || endpoint.metadata[metaKey] !== value) return false;
      }
    }
    return true;
  });
}

function displayEndpoints(endpoints: EndpointSnapshot[], source: 'router' | 'hostess'): void {
  if (endpoints.length === 0) {
    console.log('No endpoints match the filters.');
    return;
  }

  console.log(`Registered Endpoints (${source === 'router' ? 'RoutingServer snapshot' : 'Hostess snapshot'})`);
  console.log('');

  for (const endpoint of endpoints) {
    console.log(`ID:          ${endpoint.id}`);
    console.log(`Type:        ${endpoint.type}`);
    console.log(`Coordinates: ${endpoint.coordinates}`);
    if (endpoint.metadata && Object.keys(endpoint.metadata).length > 0) {
      console.log(`Metadata:    ${JSON.stringify(endpoint.metadata)}`);
    }
    if (endpoint.announcedAt !== undefined) {
      console.log(`Announced:   ${formatTimestamp(endpoint.announcedAt)}`);
    }
    if (endpoint.updatedAt !== undefined) {
      console.log(`Updated:     ${formatTimestamp(endpoint.updatedAt)}`);
    }
    console.log('');
  }
}

async function handleEndpointsCommand(args: string[]): Promise<void> {
  const { watch, interval, filters, json } = parseEndpointsArgs(args);

  if (!watch) {
    const { endpoints, source } = await loadEndpointSnapshot();
    
    if (endpoints.length === 0) {
      if (json) {
        console.log('[]');
      } else {
        console.log('No endpoints registered. (Run `mkctl run` first to generate a snapshot.)');
      }
      return;
    }

    const filtered = applyFilters(endpoints, filters);
    
    if (json) {
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      displayEndpoints(filtered, source);
    }
    return;
  }

  console.log(`Watching endpoints (refresh every ${interval}s)...`);
  console.log('Press Ctrl+C to stop.\n');

  let running = true;
  const cleanup = () => {
    running = false;
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  };

  const onSignal = () => {
    cleanup();
    console.log('\nWatch stopped.');
  };

  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  while (running) {
    const { endpoints, source } = await loadEndpointSnapshot();
    const filtered = applyFilters(endpoints, filters);

    console.clear();
    console.log(`[${formatTimestamp(Date.now())}] Watching endpoints (refresh every ${interval}s)...`);
    console.log('Press Ctrl+C to stop.\n');

    if (endpoints.length === 0) {
      console.log('No endpoints registered.');
    } else {
      displayEndpoints(filtered, source);
    }

    await new Promise((resolve) => setTimeout(resolve, interval * 1000));
  }
}

async function writeRouterSnapshot(router: RoutingServer): Promise<void> {
  const snapshotDir = path.resolve(process.cwd(), 'reports');
  const snapshotPath = path.join(snapshotDir, 'router-endpoints.json');
  await fs.mkdir(snapshotDir, { recursive: true });
  const payload: RoutingEndpoint[] = router.list();
  await fs.writeFile(snapshotPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`[mkctl] Router endpoints captured at ${snapshotPath}`);
}

async function handleRunCommand(args: string[]): Promise<number> {
  const { configPath, durationMs, snapshotIntervalMs } = parseRunArgs(args);

  const localNodeMode = process.env.MK_LOCAL_NODE === '1';
  if (localNodeMode) {
    console.log('[mkctl] Running in Local Node mode (MK_LOCAL_NODE=1): network features disabled.');
  }

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
  const router = new RoutingServer();
  executor.setRoutingServer(router);

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
    
    // Check if this is a health check failure
    if (message.includes('Health check failed')) {
      throw new MkctlError(
        `Health check failed: ${message}\nHint: verify external process is responsive and health check configuration is correct.`,
        EXIT_CODES.RUNTIME,
        { cause: err }
      );
    }
    
    throw new MkctlError(
      `Failed to start topology: ${message}\nHint: verify module names and external commands referenced by the config.`,
      EXIT_CODES.RUNTIME,
      { cause: err }
    );
  }

  console.log(`Topology running for ${durationMs / 1000} seconds...\n`);

  let snapshotTimer: NodeJS.Timeout | undefined;
  if (snapshotIntervalMs) {
    console.log(`[mkctl] Mid-run snapshots enabled (every ${snapshotIntervalMs / 1000}s)`);
    let snapshotCount = 0;
    snapshotTimer = setInterval(() => {
      snapshotCount++;
      writeRouterSnapshot(router).catch((err) => {
        logError(`Failed to write snapshot ${snapshotCount}: ${err instanceof Error ? err.message : String(err)}`);
      });
    }, snapshotIntervalMs);
  }

  const outcome = await waitForDurationOrSignal(durationMs);

  if (snapshotTimer) {
    clearInterval(snapshotTimer);
  }

  await writeRouterSnapshot(router).catch((err) => {
    logError(`Failed to write router snapshot: ${err instanceof Error ? err.message : String(err)}`);
  });

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
