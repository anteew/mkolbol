import * as fs from 'fs';
import * as path from 'path';
import { yamlToJson, jsonToYaml } from './format.js';
function parseFormatArgs(args) {
    const options = {};
    let toFormat;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--to') {
            toFormat = args[++i];
        }
        else if (arg.startsWith('--to=')) {
            toFormat = arg.split('=')[1];
        }
        else if (arg === '--yaml') {
            options.yaml = true;
        }
        else if (arg === '--yaml-in') {
            options.yamlIn = true;
        }
        else if (arg === '--yaml-out') {
            options.yamlOut = true;
        }
        else if (arg.startsWith('--format=')) {
            const format = arg.split('=')[1];
            if (!['json', 'yaml', 'auto'].includes(format)) {
                console.error(`Invalid format: ${format}. Must be json, yaml, or auto.`);
                process.exit(1);
            }
            options.format = format;
        }
        else if (arg === '--format') {
            const format = args[++i];
            if (!['json', 'yaml', 'auto'].includes(format)) {
                console.error(`Invalid format: ${format}. Must be json, yaml, or auto.`);
                process.exit(1);
            }
            options.format = format;
        }
        else if (arg.startsWith('--file=')) {
            options.file = arg.split('=')[1];
        }
        else if (arg === '--file') {
            options.file = args[++i];
        }
        else if (arg === '--in-place') {
            options.inPlace = true;
        }
        else if (arg === '--dry-run') {
            options.dryRun = true;
        }
    }
    return { options, toFormat };
}
function determineFormatIn(options, fileExt) {
    if (options.format && options.format !== 'auto') {
        return options.format;
    }
    if (options.yaml || options.yamlIn) {
        return 'yaml';
    }
    if (fileExt === '.yaml' || fileExt === '.yml') {
        return 'yaml';
    }
    return 'json';
}
export async function formatHandler(args) {
    const { options, toFormat } = parseFormatArgs(args);
    if (!toFormat || !['json', 'yaml'].includes(toFormat)) {
        console.error('Format command requires --to json|yaml');
        console.error('Usage: mk format --to json|yaml [--file <path>] [--in-place] [--dry-run]');
        return 1;
    }
    const defaultFile = toFormat === 'yaml' ? 'mk.json' : 'mk.yaml';
    const filePath = options.file || defaultFile;
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return 1;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const formatIn = determineFormatIn(options, ext);
    let result;
    try {
        if (toFormat === 'yaml') {
            const jsonObj = formatIn === 'yaml' ? yamlToJson(content) : JSON.parse(content);
            result = jsonToYaml(jsonObj);
        }
        else {
            const jsonObj = formatIn === 'yaml' ? yamlToJson(content) : JSON.parse(content);
            result = JSON.stringify(jsonObj, null, 2) + '\n';
        }
        if (options.dryRun) {
            console.log(`[DRY RUN] Would convert ${filePath} to ${toFormat.toUpperCase()}:\n`);
            console.log(result);
            return 0;
        }
        if (options.inPlace) {
            const newPath = filePath.replace(/\.(json|yaml|yml)$/, toFormat === 'yaml' ? '.yaml' : '.json');
            fs.writeFileSync(newPath, result, 'utf-8');
            console.log(`Converted ${filePath} → ${newPath}`);
        }
        else {
            console.log(result);
        }
        return 0;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`Error converting format: ${error.message}`);
        }
        else {
            console.error('Unknown error during format conversion');
        }
        return 1;
    }
}
//# sourceMappingURL=formatHandler.js.map