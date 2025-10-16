#!/usr/bin/env node
import { generatePromptSnippet, disablePrompt, enablePrompt, isPromptDisabled } from '../src/mk/prompt.js';
import { createError, formatError, isJsonOutputRequested, MkError } from '../src/mk/errors.js';
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 64;
const commands = [
    {
        name: 'init',
        description: 'Initialize a new mkolbol project',
        usage: 'mk init [project-name]',
        handler: async (args) => {
            console.log('Not implemented yet');
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
        name: 'doctor',
        description: 'Diagnose system and dependency issues',
        usage: 'mk doctor [--verbose]',
        handler: async (args) => {
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
        usage: 'mk fetch <tag>',
        handler: async (args) => {
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
            }
            catch (error) {
                console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
                return EXIT_ERROR;
            }
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
function printCommandHelp(cmd) {
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
        }
        else {
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