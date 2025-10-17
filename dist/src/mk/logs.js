import * as fs from 'fs';
import * as path from 'path';
import { createInterface } from 'readline';
const LEVEL_VALUES = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
function _parseDebugLog(line) {
    try {
        const timestampMatch = line.match(/^\[([\d-T:.Z]+)\]/);
        const levelMatch = line.match(/\[([A-Z]+)\]/);
        const moduleMatch = line.match(/\[([a-z-]+)\]/);
        const eventMatch = line.match(/\]\s+([^:]+)(?::(.*))?$/);
        if (timestampMatch && levelMatch && moduleMatch) {
            const level = levelMatch[1].toLowerCase();
            const event = eventMatch ? eventMatch[1].trim() : 'unknown';
            const payloadStr = eventMatch && eventMatch[2] ? eventMatch[2].trim() : undefined;
            let payload = undefined;
            if (payloadStr) {
                try {
                    payload = JSON.parse(payloadStr);
                }
                catch {
                    payload = payloadStr;
                }
            }
            return {
                timestamp: timestampMatch[1],
                level,
                module: moduleMatch[1],
                event,
                payload,
            };
        }
    }
    catch {
        return null;
    }
    return null;
}
function parseJsonlLog(line) {
    try {
        const data = JSON.parse(line);
        if (data.evt && data.evt.startsWith('debug.')) {
            const parts = data.evt.split('.');
            const module = parts[1] || 'unknown';
            const event = parts.slice(2).join('.') || 'unknown';
            return {
                timestamp: data.ts ? new Date(data.ts).toISOString() : new Date().toISOString(),
                level: data.lvl || 'info',
                module,
                event,
                payload: data.payload,
            };
        }
    }
    catch {
        return null;
    }
    return null;
}
function shouldIncludeLog(entry, options) {
    if (options.module && entry.module !== options.module) {
        return false;
    }
    if (options.level) {
        const entryLevel = LEVEL_VALUES[entry.level];
        const filterLevel = LEVEL_VALUES[options.level];
        if (entryLevel > filterLevel) {
            return false;
        }
    }
    return true;
}
function formatLogHuman(entry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const moduleStr = entry.module.padEnd(15);
    const payload = entry.payload ? ` ${JSON.stringify(entry.payload)}` : '';
    return `[${timestamp}] ${levelStr} [${moduleStr}] ${entry.event}${payload}`;
}
function formatLogJson(entry) {
    return JSON.stringify(entry);
}
async function tailDebugLogs(_options) {
    const debugLog = process.env.DEBUG === '1' || process.env.MK_DEBUG_MODULES;
    if (!debugLog) {
        console.error('Debug logging is not enabled. Set DEBUG=1 or MK_DEBUG_MODULES to enable.');
        return;
    }
    console.error('Reading from console output (DEBUG mode)...');
    console.error('This command works best with pre-captured logs or JSONL files.');
    console.error('Use: DEBUG=1 mk run <topology> 2>&1 | mk logs [options]');
}
async function tailJsonlLogs(logPath, options) {
    if (!fs.existsSync(logPath)) {
        throw new Error(`Log file not found: ${logPath}`);
    }
    const stream = fs.createReadStream(logPath);
    const rl = createInterface({
        input: stream,
        crlfDelay: Infinity,
    });
    const entries = [];
    for await (const line of rl) {
        const entry = parseJsonlLog(line);
        if (entry && shouldIncludeLog(entry, options)) {
            entries.push(entry);
        }
    }
    const linesToShow = options.lines || 50;
    const toDisplay = entries.slice(-linesToShow);
    for (const entry of toDisplay) {
        const formatted = options.json ? formatLogJson(entry) : formatLogHuman(entry);
        console.log(formatted);
    }
}
async function followJsonlLogs(logPath, options) {
    if (!fs.existsSync(logPath)) {
        throw new Error(`Log file not found: ${logPath}`);
    }
    let position = 0;
    const fileStats = fs.statSync(logPath);
    position = Math.max(0, fileStats.size);
    console.error(`Following logs from: ${logPath}`);
    console.error('Press Ctrl+C to stop...\n');
    const checkForChanges = () => {
        const currentStats = fs.statSync(logPath);
        if (currentStats.size > position) {
            const stream = fs.createReadStream(logPath, {
                start: position,
                encoding: 'utf8',
            });
            let buffer = '';
            stream.on('data', (chunk) => {
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        const entry = parseJsonlLog(line);
                        if (entry && shouldIncludeLog(entry, options)) {
                            const formatted = options.json ? formatLogJson(entry) : formatLogHuman(entry);
                            console.log(formatted);
                        }
                    }
                }
            });
            stream.on('end', () => {
                position = currentStats.size;
            });
        }
    };
    const interval = setInterval(checkForChanges, 500);
    process.on('SIGINT', () => {
        clearInterval(interval);
        console.error('\nStopped following logs.');
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        clearInterval(interval);
        process.exit(0);
    });
}
export async function tailLogs(options) {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
        await tailDebugLogs(options);
        return;
    }
    const suites = fs.readdirSync(reportsDir).filter(f => {
        const stat = fs.statSync(path.join(reportsDir, f));
        return stat.isDirectory();
    });
    if (suites.length === 0) {
        await tailDebugLogs(options);
        return;
    }
    const suite = suites[0];
    const suiteDir = path.join(reportsDir, suite);
    const logFiles = fs.readdirSync(suiteDir).filter(f => f.endsWith('.jsonl'));
    if (logFiles.length === 0) {
        await tailDebugLogs(options);
        return;
    }
    const latestLog = logFiles
        .map(f => ({
        name: f,
        path: path.join(suiteDir, f),
        mtime: fs.statSync(path.join(suiteDir, f)).mtime,
    }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];
    if (options.follow) {
        await followJsonlLogs(latestLog.path, options);
    }
    else {
        await tailJsonlLogs(latestLog.path, options);
    }
}
//# sourceMappingURL=logs.js.map