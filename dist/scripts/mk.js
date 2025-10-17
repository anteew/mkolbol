#!/usr/bin/env node
import { generatePromptSnippet, disablePrompt, enablePrompt, isPromptDisabled } from '../src/mk/prompt.js';
import { createError, formatError, isJsonOutputRequested, MkError } from '../src/mk/errors.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 64;
const commands = [
    {
        name: 'version',
        description: 'Print mk version',
        usage: 'mk version',
        handler: async () => {
            console.log(await getMkVersion());
            return EXIT_SUCCESS;
        }
    },
    {
        name: 'init',
        description: 'Initialize a new mkolbol project',
        usage: 'mk init [project-name] [--force] [--verbose]',
        handler: async (args) => {
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
                try {
                    await import('node:fs/promises').then(fs => fs.rm(targetDir, { recursive: true, force: true }));
                }
                catch { }
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
            }
            catch { }
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
        handler: async (args) => {
            const { runHandler } = await import('../src/mk/runHandler.js');
            return runHandler(args);
        },
    },
    {
        name: 'dev',
        description: 'Run topology with hot-reload for in-proc modules',
        usage: 'mk dev <config> [--verbose]',
        handler: async (args) => {
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
                    }
                    catch (err) {
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
                await new Promise((resolve) => {
                    // Never resolves - keeps process running until signal
                });
                return EXIT_SUCCESS;
            }
            catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
                return EXIT_ERROR;
            }
        },
    },
    {
        name: 'doctor',
        description: 'Diagnose system and dependency issues',
        usage: 'mk doctor [--verbose] [--section all|toolchain|environment] [--json]',
        handler: async (args) => {
            const verbose = args.includes('--verbose');
            const jsonOutput = args.includes('--json');
            let section = 'all';
            const sectionIndex = args.findIndex(a => a === '--section');
            if (sectionIndex !== -1 && args[sectionIndex + 1]) {
                const sectionArg = args[sectionIndex + 1];
                if (sectionArg === 'toolchain' || sectionArg === 'environment' || sectionArg === 'all') {
                    section = sectionArg;
                }
                else {
                    console.error(`Invalid --section value: ${sectionArg}. Use: all, toolchain, or environment`);
                    return EXIT_USAGE;
                }
            }
            const { runDoctorChecks, formatCheckResults } = await import('../src/mk/doctor.js');
            const results = await runDoctorChecks(verbose, section);
            const output = formatCheckResults(results, jsonOutput ? 'json' : 'text');
            console.log(output);
            const hasFailed = results.some(r => r.status === 'fail');
            return hasFailed ? EXIT_ERROR : EXIT_SUCCESS;
        },
    },
    {
        name: 'graph',
        description: 'Visualize topology graph',
        usage: 'mk graph <config> [--json]',
        handler: async (args) => {
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
                }
                else {
                    const ascii = generateAsciiGraph(topology);
                    console.log(ascii);
                }
                return EXIT_SUCCESS;
            }
            catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
                return EXIT_ERROR;
            }
        },
    },
    {
        name: 'format',
        description: 'Convert between JSON and YAML formats',
        usage: 'mk format --to json|yaml [--file <path>] [--in-place] [--dry-run] [--yaml] [--yaml-in] [--yaml-out] [--format json|yaml|auto]',
        handler: async (args) => {
            const { formatHandler } = await import('../src/mk/formatHandler.js');
            return formatHandler(args);
        },
    },
    {
        name: 'prompt',
        description: 'Generate LLM-friendly project state snippet',
        usage: 'mk prompt [--off | --on]',
        handler: async (args) => {
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
        usage: 'mk fetch <tag> [--verify] [--force] [--no-install]',
        handler: async (args) => {
            if (args.length === 0 || args[0].startsWith('--')) {
                console.error('Error: Missing release tag');
                console.error('Usage: mk fetch <tag> [--verify] [--force] [--no-install]');
                console.error('Examples: mk fetch v0.2.0, mk fetch latest --verify');
                return EXIT_USAGE;
            }
            const tag = args[0];
            const verify = args.includes('--verify');
            const forceDownload = args.includes('--force');
            const noInstall = args.includes('--no-install');
            try {
                const { downloadRelease, installTarball } = await import('../src/mk/fetch.js');
                console.error(`Fetching release ${tag}...`);
                const tarballPath = await downloadRelease(tag, { verify, forceDownload });
                if (!noInstall) {
                    await installTarball(tarballPath);
                }
                else {
                    console.error(`Tarball ready at: ${tarballPath}`);
                }
                return EXIT_SUCCESS;
            }
            catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
                return EXIT_ERROR;
            }
        },
    },
    {
        name: 'logs',
        description: 'Tail module logs with filtering',
        usage: 'mk logs [--module <name>] [--level <error|warn|info|debug>] [--json] [--follow] [--lines <n>]',
        handler: async (args) => {
            const { tailLogs } = await import('../src/mk/logs.js');
            const options = {};
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (arg === '--module' && i + 1 < args.length) {
                    options.module = args[++i];
                }
                else if (arg === '--level' && i + 1 < args.length) {
                    const level = args[++i];
                    if (level === 'error' || level === 'warn' || level === 'info' || level === 'debug') {
                        options.level = level;
                    }
                    else {
                        console.error(`Invalid level: ${level}. Use: error, warn, info, or debug`);
                        return EXIT_USAGE;
                    }
                }
                else if (arg === '--json') {
                    options.json = true;
                }
                else if (arg === '--follow' || arg === '-f') {
                    options.follow = true;
                }
                else if (arg === '--lines' && i + 1 < args.length) {
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
            }
            catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
                return EXIT_ERROR;
            }
        },
    },
    {
        name: 'trace',
        description: 'Lightweight flow timing analysis for topology',
        usage: 'mk trace <config> [--duration <seconds>] [--json] [--verbose]',
        handler: async (args) => {
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
                }
                else if (arg === '--json') {
                    jsonOutput = true;
                }
                else if (arg === '--verbose') {
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
            }
            catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
                return EXIT_ERROR;
            }
        },
    },
    {
        name: 'recipes',
        description: 'List curated topology patterns and examples',
        usage: 'mk recipes [--list | --show <name>]',
        handler: async (args) => {
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
        handler: async (args) => {
            const { buildHandler } = await import('../src/mk/build.js');
            return buildHandler(args);
        },
    },
    {
        name: 'package',
        description: 'Create distributable capsule from bundle',
        usage: 'mk package',
        handler: async (args) => {
            const { packageHandler } = await import('../src/mk/package.js');
            return packageHandler(args);
        },
    },
    {
        name: 'ci',
        description: 'CI utilities (plan: matrix + cache keys)',
        usage: 'mk ci plan [--env | --json]',
        handler: async (args) => {
            if (args.length === 0 || args[0] !== 'plan') {
                console.error('Usage: mk ci plan [--env | --json]');
                return EXIT_USAGE;
            }
            const { ciPlanHandler } = await import('../src/mk/ciPlan.js');
            return ciPlanHandler(args.slice(1));
        },
    },
    {
        name: 'self',
        description: 'Manage mk installation (install, uninstall, where, switch)',
        usage: 'mk self install|uninstall|where|switch [options]',
        handler: async (args) => {
            if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
                console.log('Manage mk installation\n');
                console.log('Usage:');
                console.log('  mk self install [--bin-dir <path>] [--from repo|global] [--copy]');
                console.log('  mk self uninstall [--bin-dir <path>]');
                console.log('  mk self where');
                console.log('  mk self switch <version>');
                return EXIT_SUCCESS;
            }
            const subcommand = args[0];
            const subArgs = args.slice(1);
            const { install, uninstall, where, switchVersion } = await import('../src/mk/selfInstall.js');
            if (subcommand === 'install') {
                let binDir;
                let from = 'repo';
                let copy = false;
                let verbose = false;
                for (let i = 0; i < subArgs.length; i++) {
                    if ((subArgs[i] === '--bin-dir' || subArgs[i] === '-B') && i + 1 < subArgs.length) {
                        binDir = subArgs[++i];
                    }
                    else if (subArgs[i] === '--from' && i + 1 < subArgs.length) {
                        const value = subArgs[++i];
                        if (value === 'repo' || value === 'global') {
                            from = value;
                        }
                        else {
                            console.error('Error: --from must be "repo" or "global"');
                            return EXIT_USAGE;
                        }
                    }
                    else if (subArgs[i] === '--copy') {
                        copy = true;
                    }
                    else if (subArgs[i] === '--verbose' || subArgs[i] === '-v') {
                        verbose = true;
                    }
                }
                if (!binDir) {
                    const home = process.env.HOME || process.env.USERPROFILE || '.';
                    const { resolve } = await import('node:path');
                    binDir = resolve(home, '.local', 'bin');
                }
                const result = install({ binDir, from, copy, verbose });
                console.log(result.message);
                return result.success ? EXIT_SUCCESS : EXIT_ERROR;
            }
            else if (subcommand === 'uninstall') {
                let binDir;
                for (let i = 0; i < subArgs.length; i++) {
                    if ((subArgs[i] === '--bin-dir' || subArgs[i] === '-B') && i + 1 < subArgs.length) {
                        binDir = subArgs[++i];
                    }
                }
                if (!binDir) {
                    const home = process.env.HOME || process.env.USERPROFILE || '.';
                    const { resolve } = await import('node:path');
                    binDir = resolve(home, '.local', 'bin');
                }
                const result = uninstall(binDir);
                console.log(result.message);
                return result.success ? EXIT_SUCCESS : EXIT_ERROR;
            }
            else if (subcommand === 'where') {
                const result = where();
                console.log(result.message);
                return result.success ? EXIT_SUCCESS : EXIT_ERROR;
            }
            else if (subcommand === 'switch') {
                if (subArgs.length === 0) {
                    console.error('Error: Missing version argument');
                    console.error('Usage: mk self switch <version>');
                    return EXIT_USAGE;
                }
                const version = subArgs[0];
                const result = switchVersion(version);
                console.log(result.message);
                return result.success ? EXIT_SUCCESS : EXIT_ERROR;
            }
            else {
                console.error(`Error: Unknown subcommand '${subcommand}'`);
                console.error('Use: mk self install|uninstall|where|switch');
                return EXIT_USAGE;
            }
        },
    },
    {
        name: 'bootstrap',
        description: 'Create out-of-tree project with mkolbol as dependency',
        usage: 'mk bootstrap <app-dir> [--yes] [--verbose] [--template <name>] [--source tarball|git|local] [--git-tag <tag>] [--tarball <path>]',
        handler: async (args) => {
            if (args.length === 0 || args[0].startsWith('--')) {
                console.error('Error: Missing app directory');
                console.error('Usage: mk bootstrap <app-dir> [--yes] [--verbose] [--template <name>]');
                return EXIT_USAGE;
            }
            const appDir = args[0];
            const yes = args.includes('--yes') || args.includes('-y');
            const verbose = args.includes('--verbose');
            let template;
            let source = 'local';
            let gitTag;
            let tarballPath;
            for (let i = 1; i < args.length; i++) {
                const arg = args[i];
                if (arg === '--template' && i + 1 < args.length) {
                    template = args[++i];
                }
                else if (arg === '--source' && i + 1 < args.length) {
                    const srcValue = args[++i];
                    if (srcValue === 'tarball' || srcValue === 'git' || srcValue === 'local') {
                        source = srcValue;
                    }
                    else {
                        console.error(`Invalid --source value: ${srcValue}. Use: tarball, git, or local`);
                        return EXIT_USAGE;
                    }
                }
                else if (arg === '--git-tag' && i + 1 < args.length) {
                    gitTag = args[++i];
                }
                else if (arg === '--tarball' && i + 1 < args.length) {
                    tarballPath = args[++i];
                }
            }
            try {
                const { bootstrapProject } = await import('../src/mk/bootstrap.js');
                await bootstrapProject(appDir, { yes, verbose, template, source, gitTag, tarballPath });
                return EXIT_SUCCESS;
            }
            catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
                return EXIT_ERROR;
            }
        },
    },
    {
        name: 'self-install',
        description: 'Install mk globally (safe tarball method) or install PATH wrappers',
        usage: 'mk self-install [--wrapper-only] [--bin-dir <path>]',
        handler: async (args) => {
            const wrapperOnly = args.includes('--wrapper-only');
            let binDir;
            for (let i = 0; i < args.length; i++) {
                if ((args[i] === '--bin-dir' || args[i] === '-B') && i + 1 < args.length) {
                    binDir = args[i + 1];
                    i++;
                }
            }
            if (!wrapperOnly) {
                // Safe global install via npm pack → npm i -g tarball
                try {
                    const { spawn } = await import('node:child_process');
                    const { readdirSync } = await import('node:fs');
                    const { resolve } = await import('node:path');
                    await new Promise((resolveP, rejectP) => {
                        const p = spawn('npm', ['pack'], { stdio: 'inherit' });
                        p.on('exit', (code) => (code === 0 ? resolveP() : rejectP(new Error('npm pack failed'))));
                    });
                    const tarball = readdirSync(process.cwd()).find((f) => /^mkolbol-.*\.tgz$/.test(f));
                    if (!tarball) {
                        console.error('Error: no tarball produced by npm pack.');
                        return EXIT_ERROR;
                    }
                    console.log(`Installing ${tarball} globally...`);
                    await new Promise((resolveP, rejectP) => {
                        const p = spawn('npm', ['install', '-g', tarball], { stdio: 'inherit' });
                        p.on('exit', (code) => (code === 0 ? resolveP() : rejectP(new Error('npm install -g failed'))));
                    });
                    console.log('✓ Installed globally. mk should be on your PATH.');
                    return EXIT_SUCCESS;
                }
                catch (err) {
                    console.error(`Global install failed: ${err instanceof Error ? err.message : String(err)}`);
                    console.error('Tip: retry with --wrapper-only or ensure npm global bin is on PATH.');
                    return EXIT_ERROR;
                }
            }
            // Wrapper-only mode: create mk/mkctl scripts under ~/.local/bin (or provided binDir)
            try {
                const { mkdir, writeFile } = await import('node:fs/promises');
                const pathMod = await import('node:path');
                const home = process.env.HOME || process.env.USERPROFILE || '.';
                const outDir = binDir
                    ? (pathMod.isAbsolute(binDir) ? binDir : pathMod.resolve(process.cwd(), binDir))
                    : pathMod.resolve(home, '.local', 'bin');
                await mkdir(outDir, { recursive: true });
                const mkPath = pathMod.resolve(outDir, 'mk');
                const mkctlPath = pathMod.resolve(outDir, 'mkctl');
                const mkScript = `#!/usr/bin/env bash\nexec node \"${pathMod.resolve(process.cwd(), 'dist/scripts/mk.js')}\" \"$@\"\n`;
                const mkctlScript = `#!/usr/bin/env bash\nexec node \"${pathMod.resolve(process.cwd(), 'dist/scripts/mkctl.js')}\" \"$@\"\n`;
                await writeFile(mkPath, mkScript, { mode: 0o755 });
                await writeFile(mkctlPath, mkctlScript, { mode: 0o755 });
                console.log(`✓ Installed wrappers in ${outDir}`);
                console.log('Ensure this directory is on your PATH. Example:');
                console.log(`  export PATH=\"$PATH:${outDir}\"`);
                return EXIT_SUCCESS;
            }
            catch (err) {
                console.error(`Wrapper install failed: ${err instanceof Error ? err.message : String(err)}`);
                return EXIT_ERROR;
            }
        },
    },
];
function printMainHelp() {
    console.log(`mk — mkolbol CLI toolkit\n`);
    console.log(`Usage: mk <command> [options]\n`);
    console.log(`Global Flags:`);
    console.log(`  --project-dir <dir>   Run mk as if started in <dir>  (alias: -C <dir>)`);
    console.log(`  --version, -V         Print mk version`);
    console.log('');
    console.log(`Commands:`);
    for (const cmd of commands) {
        console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
    }
    console.log(`\nUse 'mk <command> --help' for more information about a command.`);
}
function printCommandHelp(cmd) {
    console.log(`${cmd.description}\n`);
    console.log(`Usage: ${cmd.usage}`);
}
async function mkMain() {
    let args = process.argv.slice(2);
    // Global flags: -C/--project/--project-dir to change directory, --version/-V for version info
    const projectFlagIndex = args.findIndex((a) => a === '-C' || a === '--project' || a === '--project-dir');
    if (projectFlagIndex !== -1) {
        const dir = args[projectFlagIndex + 1];
        if (!dir || dir.startsWith('-')) {
            console.error('Usage: mk --project-dir <dir> <command> ...  (alias: -C <dir>)');
            process.exit(EXIT_USAGE);
        }
        try {
            const { resolve } = await import('node:path');
            const target = resolve(process.cwd(), dir);
            process.chdir(target);
            // Remove flag and its value from args
            args = args.filter((_, i) => i !== projectFlagIndex && i !== projectFlagIndex + 1);
        }
        catch (err) {
            console.error(`Error entering project directory '${dir}': ${err instanceof Error ? err.message : String(err)}`);
            process.exit(EXIT_ERROR);
        }
    }
    if (args.includes('--version') || args.includes('-V')) {
        console.log(await getMkVersion());
        process.exit(EXIT_SUCCESS);
    }
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printMainHelp();
        process.exit(EXIT_SUCCESS);
    }
    const commandName = args[0];
    const command = commands.find((cmd) => cmd.name === commandName);
    if (!command) {
        const isJson = isJsonOutputRequested(args);
        const errObj = createError('UNKNOWN_COMMAND', { details: { command: commandName } });
        if (isJson) {
            console.error(formatError(errObj, 'json'));
        }
        else {
            console.error(formatError(errObj, 'text'));
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
    }
    catch (error) {
        const jsonOutput = isJsonOutputRequested(commandArgs);
        if (error instanceof MkError) {
            console.error(formatError(error, jsonOutput ? 'json' : 'text'));
        }
        else {
            console.error(formatError(error, jsonOutput ? 'json' : 'text'));
        }
        process.exit(EXIT_ERROR);
    }
}
async function getMkVersion() {
    try {
        const { readFile } = await import('node:fs/promises');
        const here = dirname(fileURLToPath(import.meta.url)); // dist/scripts
        const pkgPath = resolvePath(here, '../../package.json');
        const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
        return String(pkg?.version || '0.0.0');
    }
    catch {
        return '0.0.0';
    }
}
mkMain().catch((error) => {
    const jsonOutput = isJsonOutputRequested(process.argv.slice(2));
    if (error instanceof MkError) {
        console.error(formatError(error, jsonOutput ? 'json' : 'text'));
    }
    else {
        const fatalError = error instanceof Error ? error : new Error(String(error));
        console.error(formatError(fatalError, jsonOutput ? 'json' : 'text'));
    }
    process.exit(EXIT_ERROR);
});
//# sourceMappingURL=mk.js.map