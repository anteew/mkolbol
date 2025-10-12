import { config } from './config.js';
import { getGlobalDebugLogger, initGlobalDebugLogger } from '../logging/logger.js';
const LEVEL_VALUES = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
};
class Debug {
    on(module) {
        if (!config.enabled)
            return false;
        if (config.modules.size === 0)
            return true;
        return config.modules.has(module) || config.modules.has('*');
    }
    shouldEmit(module, level) {
        if (!this.on(module))
            return false;
        return LEVEL_VALUES[level] <= config.levelValue;
    }
    emit(module, event, payload, level = 'debug') {
        if (!this.shouldEmit(module, level))
            return;
        const debugEvent = {
            module,
            level,
            event,
            payload,
        };
        if (this.isLaminarPresent()) {
            this.emitAsTestEvent(debugEvent);
        }
        else {
            this.emitToConsole(debugEvent);
        }
    }
    isLaminarPresent() {
        return process.env.LAMINAR_DEBUG === '1' || process.env.LAMINAR_SUITE !== undefined;
    }
    emitAsTestEvent(debugEvent) {
        initGlobalDebugLogger();
        const logger = getGlobalDebugLogger();
        if (logger) {
            logger.emit(`debug.${debugEvent.module}.${debugEvent.event}`, {
                lvl: this.mapLevelToLogLevel(debugEvent.level),
                payload: debugEvent.payload,
            });
        }
        else {
            const envelope = {
                ts: Date.now(),
                lvl: this.mapLevelToLogLevel(debugEvent.level),
                case: process.env.LAMINAR_CASE || 'debug',
                evt: `debug.${debugEvent.module}.${debugEvent.event}`,
                payload: debugEvent.payload,
            };
            console.log(JSON.stringify(envelope));
        }
    }
    emitToConsole(debugEvent) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${debugEvent.level.toUpperCase()}] [${debugEvent.module}]`;
        const message = debugEvent.payload
            ? `${prefix} ${debugEvent.event}: ${JSON.stringify(debugEvent.payload)}`
            : `${prefix} ${debugEvent.event}`;
        console.log(message);
    }
    mapLevelToLogLevel(level) {
        if (level === 'trace')
            return 'debug';
        if (level === 'error' || level === 'warn' || level === 'info')
            return level;
        return 'debug';
    }
}
export const debug = new Debug();
//# sourceMappingURL=api.js.map