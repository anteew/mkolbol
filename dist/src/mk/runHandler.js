import { existsSync } from 'fs';
import { loadConfig } from '../config/loader.js';
import { EXIT_CODES } from './errors.js';
export async function runHandler(args) {
    const dryRunIndex = args.indexOf('--dry-run');
    const isDryRun = dryRunIndex !== -1;
    if (isDryRun) {
        args.splice(dryRunIndex, 1);
    }
    if (args.length === 0) {
        console.error('Error: Missing topology file');
        console.error('Usage: mk run <topology-file> [--dry-run]');
        return EXIT_CODES.USAGE;
    }
    const topologyFile = args[0];
    if (!existsSync(topologyFile)) {
        console.error(`Error: Config file not found: ${topologyFile}`);
        return EXIT_CODES.CONFIG_NOT_FOUND;
    }
    try {
        // loadConfig handles JSON/YAML and accepts { topology: { ... } } wrappers
        loadConfig(topologyFile, { validate: true });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (/not found|ENOENT/i.test(msg)) {
            console.error(`Error: Config file not found: ${topologyFile}`);
            return EXIT_CODES.CONFIG_NOT_FOUND;
        }
        if (/parse|yaml|json/i.test(msg)) {
            console.error(`Error: Failed to parse config file`);
            console.error(`  ${msg}`);
            return EXIT_CODES.CONFIG_INVALID;
        }
        console.error(`Error: Configuration validation failed`);
        console.error(`  ${msg}`);
        return EXIT_CODES.VALIDATION_ERROR;
    }
    if (isDryRun) {
        console.log('✓ Configuration is valid');
        return EXIT_CODES.SUCCESS;
    }
    console.log('Error: Actual run mode not implemented yet');
    return EXIT_CODES.ERROR;
}
//# sourceMappingURL=runHandler.js.map