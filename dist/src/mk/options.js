import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
function findGitRoot(startDir) {
    try {
        const root = execSync('git rev-parse --show-toplevel', {
            cwd: startDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        return root;
    }
    catch {
        return null;
    }
}
function findOptionsFiles(startDir) {
    const paths = [];
    const gitRoot = findGitRoot(startDir);
    let current = path.resolve(startDir);
    const root = gitRoot ? path.resolve(gitRoot) : path.parse(current).root;
    while (true) {
        const optionsPath = path.join(current, '.mk', 'options.json');
        if (fs.existsSync(optionsPath)) {
            paths.push(optionsPath);
        }
        if (current === root) {
            break;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return paths;
}
function loadOptionsFile(filePath, profile) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        const profileData = data[profile];
        if (profileData && typeof profileData === 'object') {
            return profileData;
        }
        const defaultData = data.default;
        if (defaultData && typeof defaultData === 'object') {
            return defaultData;
        }
        return {};
    }
    catch {
        return {};
    }
}
function parseCLIArgs(args) {
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('--')) {
                const numValue = Number(nextArg);
                if (!Number.isNaN(numValue) && nextArg === String(numValue)) {
                    parsed[key] = numValue;
                }
                else if (nextArg === 'true') {
                    parsed[key] = true;
                }
                else if (nextArg === 'false') {
                    parsed[key] = false;
                }
                else {
                    parsed[key] = nextArg;
                }
                i++;
            }
            else {
                parsed[key] = true;
            }
        }
    }
    return parsed;
}
export function loadOptions(config = {}) {
    const cwd = config.cwd ?? process.cwd();
    const cliArgs = config.cliArgs ?? process.argv.slice(2);
    const cliOptions = parseCLIArgs(cliArgs);
    const profile = config.profile ?? cliOptions.profile ?? 'default';
    const optionsFiles = findOptionsFiles(cwd);
    const mergedOptions = {};
    for (let i = optionsFiles.length - 1; i >= 0; i--) {
        const filePath = optionsFiles[i];
        const fileOptions = loadOptionsFile(filePath, profile);
        Object.assign(mergedOptions, fileOptions);
    }
    Object.assign(mergedOptions, cliOptions);
    return mergedOptions;
}
export function getOptionsPrecedence(config = {}) {
    const cwd = config.cwd ?? process.cwd();
    const optionsFiles = findOptionsFiles(cwd);
    const precedence = [
        'CLI flags (--option value)',
        ...optionsFiles.map(f => `.mk/options.json (${f})`),
        'Defaults'
    ];
    return precedence;
}
//# sourceMappingURL=options.js.map