#!/usr/bin/env node

import { generatePromptSnippet, disablePrompt, enablePrompt, isPromptDisabled } from '../src/mk/prompt.js';
import { createError, formatError, isJsonOutputRequested, MkError } from '../src/mk/errors.js';

const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 64;

type Command = {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[]) => Promise<number>;
};

const commands: Command[] = [
  {
    name: 'init',
    description: 'Initialize a new mkolbol project',
    usage: 'mk init [project-name] [--force] [--verbose]',
    handler: async (args: string[]) => {
      const { mkdirSync, existsSync, cpSync, writeFileSync, readFileSync } = await import('node:fs');
      const { join, resolve } = await import('node:path');
      const { fileURLToPath } = await import('node:url');

      const projectName = args.find(a => !a.startsWith('--')) || 'mk-app';
      const force = args.includes('--force') || args.includes('-f');
      const verbose = args.includes('--verbose');

      const cwd = process.cwd();
      const targetDir = resolve(cwd, projectName);

      if (existsSync(targetDir) && !force) {
        console.error(`Error: Directory '${projectName}' already exists. Use --force to overwrite.`);
        return EXIT_USAGE;
      }

      // Resolve template directory relative to this script location (repo layout)
      const thisFile = fileURLToPath(import.meta.url);
      const scriptDir = resolve(thisFile, '..');
      // dist/scripts/mk.js → repo/examples/mk/init-templates/hello-calculator
      const templateDir = resolve(scriptDir, '../../examples/mk/init-templates/hello-calculator');

      if (!existsSync(templateDir)) {
        console.error('Error: init template not found.');
        console.error('Tip: Run mk inside the mkolbol repo or copy examples/mk/init-templates/hello-calculator manually.');
        return EXIT_ERROR;
      }

      if (existsSync(targetDir) && force) {
        // Minimal nuke: recreate directory
        try { await import('node:fs/promises').then(fs => fs.rm(targetDir, { recursive: true, force: true })); } catch {}
      }

      mkdirSync(targetDir, { recursive: true });
      cpSync(templateDir, targetDir, { recursive: true });

      // Personalize README title
      try {
        const readmePath = join(targetDir, 'README.md');
        if (existsSync(readmePath)) {
          const txt = readFileSync(readmePath, 'utf8').replace(/hello-calculator/gi, projectName);
          writeFileSync(readmePath, txt);
        }
      } catch {}

      console.log(`✓ Project created at ./${projectName}`);
      if (verbose) {
        console.log('Contents:');
        console.log('  - mk.json');
        console.log('  - .mk/options.json');
        console.log('  - src/index.ts');
        console.log('  - package.json, tsconfig.json');
        console.log('  - README.md, ACCEPTANCE.md');
      }
      console.log('\nNext steps:');
      console.log(`  cd ${projectName}`);
      console.log('  node ../dist/scripts/mk.js run mk.json --dry-run');
      console.log('  node ../dist/scripts/mk.js build && node ../dist/scripts/mk.js package');
      return EXIT_SUCCESS;
    },
  },
  {
    name: 'run',
    description: 'Run a mkolbol topology or script',
    usage: 'mk run <topology-file> [--dry-run]',
    handler: async (args: string[]) => {
      const { runHandler } = await import('../src/mk/runHandler.js');
      return runHandler(args);
    },
  },
  {
    name: 'dev',
    description: 'Run topology with hot-reload for in-proc modules',
    usage: 'mk dev <config> [--verbose]',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.error('Error: Missing topology config file');
        console.error('Usage: mk dev <config> [--verbose]');
        return EXIT_USAGE;
      }

      const configPath = args[0];
      const verbose = args.includes('--verbose');

      try {
        const { loadConfig } = await import('../src/config/loader.js');
        const { Kernel } = await import('../src/kernel/Kernel.js');
        const { Hostess } = await import('../src/hostess/Hostess.js');
        const { StateManager } = await import('../src/state/StateManager.js');
        const { Executor } = await import('../src/executor/Executor.js');
        const { watchModules } = await import('../src/mk/dev.js');
        
        // Load topology
        const topology = loadConfig(configPath);
        
        console.log('[mk dev] Starting topology with hot-reload...');
        
        // Initialize system
        const kernel = new Kernel();
        const hostess = new Hostess();
        const stateManager = new StateManager(kernel);
        const executor = new Executor(kernel, hostess, stateManager);
        
        // Register modules
        const modules = [
          { name: 'TimerSource', path: '../src/modules/timer.js' },
          { name: 'UppercaseTransform', path: '../src/modules/uppercase.js' },
          { name: 'ConsoleSink', path: '../src/modules/consoleSink.js' },
          { name: 'FilesystemSink', path: '../src/modules/filesystem-sink.js' },
          { name: 'PipeMeterTransform', path: '../src/transforms/pipeMeter.js' },
          { name: 'RateLimiterTransform', path: '../src/transforms/rateLimiter.js' },
          { name: 'TeeTransform', path: '../src/transforms/tee.js' },
        ];
        
        for (const mod of modules) {
          try {
            const modulePath = new URL(mod.path, import.meta.url).pathname;
            const moduleExport = await import(modulePath);
            executor.registerModule(mod.name, moduleExport.default || moduleExport[mod.name]);
          } catch (err) {
            // Module might not exist, skip
          }
        }
        
        // Load and start executor
        executor.load(topology);
        await executor.up();
        
        // Start file watchers
        const watcher = watchModules(executor, topology, {
          verbose,
          onReload: (nodeId) => {
            console.log(`[mk dev] Node ${nodeId} hot-reloaded`);
          }
        });
        
        console.log('[mk dev] System running. Press Ctrl+C to stop.');
        
        // Handle graceful shutdown
        const shutdown = async () => {
          console.log('\n[mk dev] Shutting down...');
          watcher.stop();
          await executor.down();
          process.exit(EXIT_SUCCESS);
        };
        
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        
        // Keep process alive
        await new Promise<void>((resolve) => {
          // Never resolves - keeps process running until signal
        });
        
        return EXIT_SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return EXIT_ERROR;
      }
    },
  },
  {
    name: 'doctor',
    description: 'Diagnose system and dependency issues',
    usage: 'mk doctor [--verbose]',
    handler: async (args: string[]) => {
      const verbose = args.includes('--verbose');
      const { runDoctorChecks, formatCheckResults } = await import('../src/mk/doctor.js');
      
      const results = await runDoctorChecks(verbose);
      const output = formatCheckResults(results);
      console.log(output);
      
      const hasFailed = results.some(r => r.status === 'fail');
      return hasFailed ? EXIT_ERROR : EXIT_SUCCESS;
    },
  },
  {
    name: 'graph',
    description: 'Visualize topology graph',
    usage: 'mk graph <config> [--json]',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.error('Error: Missing topology config file');
        console.error('Usage: mk graph <config> [--json]');
        return EXIT_USAGE;
      }

      const configPath = args[0];
      const jsonOutput = args.includes('--json');

      try {
        const { loadConfig } = await import('../src/config/loader.js');
        const { generateAsciiGraph, generateJsonGraph } = await import('../src/mk/graph.js');
        
        const topology = loadConfig(configPath);
        
        if (jsonOutput) {
          const graph = generateJsonGraph(topology);
          console.log(JSON.stringify(graph, null, 2));
        } else {
          const ascii = generateAsciiGraph(topology);
          console.log(ascii);
        }
        
        return EXIT_SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return EXIT_ERROR;
      }
    },
  },
  {
    name: 'format',
    description: 'Convert between JSON and YAML formats',
    usage: 'mk format --to json|yaml [--file <path>] [--in-place] [--dry-run] [--yaml] [--yaml-in] [--yaml-out] [--format json|yaml|auto]',
    handler: async (args: string[]) => {
      const { formatHandler } = await import('../src/mk/formatHandler.js');
      return formatHandler(args);
    },
  },
  {
    name: 'prompt',
    description: 'Generate LLM-friendly project state snippet',
    usage: 'mk prompt [--off | --on]',
    handler: async (args: string[]) => {
      const flag = args[0];
      
      if (flag === '--off') {
        await disablePrompt();
        console.log('[mk] Prompt auto-print disabled');
        console.log('State saved to: .mk/state/prompt-disabled');
        return EXIT_SUCCESS;
      }
      
      if (flag === '--on') {
        await enablePrompt();
        console.log('[mk] Prompt auto-print enabled');
        return EXIT_SUCCESS;
      }
      
      const disabled = await isPromptDisabled();
      if (disabled) {
        console.error('[mk] Prompt auto-print is disabled. Use `mk prompt --on` to enable.');
        return EXIT_ERROR;
      }
      
      const snippet = await generatePromptSnippet();
      console.log(snippet);
      return EXIT_SUCCESS;
    },
  },
  {
    name: 'fetch',
    description: 'Download and install release tarball by tag (experimental)',
    usage: 'mk fetch <tag>',
    handler: async (args: string[]) => {
      if (args.length === 0) {
        console.error('Error: Missing release tag');
        console.error('Usage: mk fetch <tag>');
        console.error('Examples: mk fetch v0.2.0, mk fetch latest');
        return EXIT_USAGE;
      }

      const tag = args[0];
      
      try {
        const { downloadRelease, installTarball } = await import('../src/mk/fetch.js');
        
        console.log(`Fetching release ${tag}...`);
        const tarballPath = await downloadRelease(tag);
        
        await installTarball(tarballPath);
        
        return EXIT_SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return EXIT_ERROR;
      }
    },
  },
  {
    name: 'logs',
    description: 'Tail module logs with filtering',
    usage: 'mk logs [--module <name>] [--level <error|warn|info|debug>] [--json] [--follow] [--lines <n>]',
    handler: async (args: string[]) => {
      const { tailLogs } = await import('../src/mk/logs.js');
      
      const options: {
        module?: string;
        level?: 'error' | 'warn' | 'info' | 'debug';
        json?: boolean;
        follow?: boolean;
        lines?: number;
      } = {};
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--module' && i + 1 < args.length) {
          options.module = args[++i];
        } else if (arg === '--level' && i + 1 < args.length) {
          const level = args[++i];
          if (level === 'error' || level === 'warn' || level === 'info' || level === 'debug') {
            options.level = level;
          } else {
            console.error(`Invalid level: ${level}. Use: error, warn, info, or debug`);
            return EXIT_USAGE;
          }
        } else if (arg === '--json') {
          options.json = true;
        } else if (arg === '--follow' || arg === '-f') {
          options.follow = true;
        } else if (arg === '--lines' && i + 1 < args.length) {
          options.lines = parseInt(args[++i], 10);
          if (isNaN(options.lines) || options.lines <= 0) {
            console.error('Invalid --lines value. Must be a positive number.');
            return EXIT_USAGE;
          }
        }
      }
      
      try {
        await tailLogs(options);
        return EXIT_SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return EXIT_ERROR;
      }
    },
  },
  {
    name: 'trace',
    description: 'Lightweight flow timing analysis for topology',
    usage: 'mk trace <config> [--duration <seconds>] [--json] [--verbose]',
    handler: async (args: string[]) => {
      if (args.length === 0 || args[0].startsWith('--')) {
        console.error('Error: Missing topology config file');
        console.error('Usage: mk trace <config> [--duration <seconds>] [--json] [--verbose]');
        return EXIT_USAGE;
      }

      const configPath = args[0];
      let duration = 5;
      let jsonOutput = false;
      let verbose = false;

      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--duration' && i + 1 < args.length) {
          duration = parseInt(args[++i], 10);
          if (isNaN(duration) || duration <= 0) {
            console.error('Invalid --duration value. Must be a positive number.');
            return EXIT_USAGE;
          }
        } else if (arg === '--json') {
          jsonOutput = true;
        } else if (arg === '--verbose') {
          verbose = true;
        }
      }

      try {
        const { loadConfig } = await import('../src/config/loader.js');
        const { captureTrace, formatTraceOutput } = await import('../src/mk/trace.js');
        
        const topology = loadConfig(configPath);
        
        if (verbose && !jsonOutput) {
          console.log(`[trace] Starting ${duration}s trace on ${configPath}...`);
        }
        
        const traceData = await captureTrace(topology, duration * 1000, { verbose });
        
        const output = formatTraceOutput(traceData, jsonOutput ? 'json' : 'text');
        console.log(output);
        
        return EXIT_SUCCESS;
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        return EXIT_ERROR;
      }
    },
  },
  {
    name: 'recipes',
    description: 'List curated topology patterns and examples',
    usage: 'mk recipes [--list | --show <name>]',
    handler: async (args: string[]) => {
      const { listRecipes, showRecipe } = await import('../src/mk/recipes.js');
      
      if (args.length === 0 || args.includes('--list')) {
        listRecipes();
        return EXIT_SUCCESS;
      }
      
      if (args[0] === '--show' && args[1]) {
        showRecipe(args[1]);
        return EXIT_SUCCESS;
      }
      
      console.error('Usage: mk recipes [--list | --show <name>]');
      return EXIT_USAGE;
    },
  },
  {
    name: 'build',
    description: 'Bundle application with esbuild and emit provenance',
    usage: 'mk build',
    handler: async (args: string[]) => {
      const { buildHandler } = await import('../src/mk/build.js');
      return buildHandler(args);
    },
  },
  {
    name: 'package',
    description: 'Create distributable capsule from bundle',
    usage: 'mk package',
    handler: async (args: string[]) => {
      const { packageHandler } = await import('../src/mk/package.js');
      return packageHandler(args);
    },
  },
  {
    name: 'ci',
    description: 'CI utilities (plan: matrix + cache keys)',
    usage: 'mk ci plan [--env | --json]',
    handler: async (args: string[]) => {
      if (args.length === 0 || args[0] !== 'plan') {
        console.error('Usage: mk ci plan [--env | --json]');
        return EXIT_USAGE;
      }
      
      const { ciPlanHandler } = await import('../src/mk/ciPlan.js');
      return ciPlanHandler(args.slice(1));
    },
  },
];

function printMainHelp() {
  console.log(`mk — mkolbol CLI toolkit\n`);
  console.log(`Usage: mk <command> [options]\n`);
  console.log(`Commands:`);
  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
  }
  console.log(`\nUse 'mk <command> --help' for more information about a command.`);
}

function printCommandHelp(cmd: Command) {
  console.log(`${cmd.description}\n`);
  console.log(`Usage: ${cmd.usage}`);
}

async function mkMain() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printMainHelp();
    process.exit(EXIT_SUCCESS);
  }

  const commandName = args[0];
  const command = commands.find((cmd) => cmd.name === commandName);

  if (!command) {
    const jsonOutput = isJsonOutputRequested(args);
    const error = createError('UNKNOWN_COMMAND', { details: { command: commandName } });
    
    if (jsonOutput) {
      console.error(formatError(error, 'json'));
    } else {
      console.error(formatError(error, 'text'));
    }
    process.exit(EXIT_USAGE);
  }

  const commandArgs = args.slice(1);

  if (commandArgs.includes('--help') || commandArgs.includes('-h')) {
    printCommandHelp(command);
    process.exit(EXIT_SUCCESS);
  }

  try {
    const exitCode = await command.handler(commandArgs);
    process.exit(exitCode);
  } catch (error) {
    const jsonOutput = isJsonOutputRequested(commandArgs);
    
    if (error instanceof MkError) {
      console.error(formatError(error, jsonOutput ? 'json' : 'text'));
    } else {
      console.error(formatError(error as Error, jsonOutput ? 'json' : 'text'));
    }
    process.exit(EXIT_ERROR);
  }
}

mkMain().catch((error) => {
  const jsonOutput = isJsonOutputRequested(process.argv.slice(2));
  
  if (error instanceof MkError) {
    console.error(formatError(error, jsonOutput ? 'json' : 'text'));
  } else {
    const fatalError = error instanceof Error ? error : new Error(String(error));
    console.error(formatError(fatalError, jsonOutput ? 'json' : 'text'));
  }
  process.exit(EXIT_ERROR);
});
