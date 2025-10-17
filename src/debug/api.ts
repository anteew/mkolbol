import { config, DebugLevel } from './config.js';
import type { TestEventEnvelope } from '../logging/TestEvent.js';
import { getGlobalDebugLogger, initGlobalDebugLogger } from '../logging/logger.js';

const LEVEL_VALUES: Record<DebugLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

export interface DebugEvent {
  module: string;
  level: DebugLevel;
  event: string;
  payload?: unknown;
}

class Debug {
  on(module: string): boolean {
    if (!config.enabled) return false;
    if (config.modules.size === 0) return true;
    return config.modules.has(module) || config.modules.has('*');
  }

  shouldEmit(module: string, level: DebugLevel): boolean {
    if (!this.on(module)) return false;
    return LEVEL_VALUES[level] <= config.levelValue;
  }

  emit(module: string, event: string, payload?: unknown, level: DebugLevel = 'debug'): void {
    if (!this.shouldEmit(module, level)) return;

    const debugEvent: DebugEvent = {
      module,
      level,
      event,
      payload,
    };

    if (this.isLaminarPresent()) {
      this.emitAsTestEvent(debugEvent);
    } else {
      this.emitToConsole(debugEvent);
    }
  }

  private isLaminarPresent(): boolean {
    return process.env.LAMINAR_DEBUG === '1' || process.env.LAMINAR_SUITE !== undefined;
  }

  private emitAsTestEvent(debugEvent: DebugEvent): void {
    initGlobalDebugLogger();
    const logger = getGlobalDebugLogger();

    if (logger) {
      logger.emit(`debug.${debugEvent.module}.${debugEvent.event}`, {
        lvl: this.mapLevelToLogLevel(debugEvent.level),
        payload: debugEvent.payload,
      });
    } else {
      const envelope: TestEventEnvelope = {
        ts: Date.now(),
        lvl: this.mapLevelToLogLevel(debugEvent.level),
        case: process.env.LAMINAR_CASE || 'debug',
        evt: `debug.${debugEvent.module}.${debugEvent.event}`,
        payload: debugEvent.payload,
      };
      console.log(JSON.stringify(envelope));
    }
  }

  private emitToConsole(debugEvent: DebugEvent): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${debugEvent.level.toUpperCase()}] [${debugEvent.module}]`;
    const message = debugEvent.payload
      ? `${prefix} ${debugEvent.event}: ${JSON.stringify(debugEvent.payload)}`
      : `${prefix} ${debugEvent.event}`;

    console.log(message);
  }

  private mapLevelToLogLevel(level: DebugLevel): 'debug' | 'info' | 'warn' | 'error' {
    if (level === 'trace') return 'debug';
    if (level === 'error' || level === 'warn' || level === 'info') return level;
    return 'debug';
  }
}

export const debug = new Debug();
