import { TimerSource } from '../modules/timer.js';
import { UppercaseTransform } from '../modules/uppercase.js';
import { ConsoleSink } from '../modules/consoleSink.js';
import { FilesystemSink } from '../modules/filesystem-sink.js';
import { XtermTTYRenderer } from '../modules/xterm-tty-renderer.js';
import { TTYRenderer } from '../modules/ttyRenderer.js';
import { PipeMeterTransform } from '../transforms/pipeMeter.js';
import { TeeTransform } from '../transforms/tee.js';
import { RateLimiterTransform } from '../transforms/rateLimiter.js';
export class ModuleRegistry {
    registry = new Map();
    constructor() {
        this.register('TimerSource', TimerSource);
        this.register('UppercaseTransform', UppercaseTransform);
        this.register('ConsoleSink', ConsoleSink);
        this.register('FilesystemSink', FilesystemSink);
        this.register('XtermTTYRenderer', XtermTTYRenderer);
        this.register('TTYRenderer', TTYRenderer);
        this.register('PipeMeterTransform', PipeMeterTransform);
        this.register('TeeTransform', TeeTransform);
        this.register('RateLimiterTransform', RateLimiterTransform);
    }
    register(name, constructor) {
        this.registry.set(name, constructor);
    }
    get(name) {
        return this.registry.get(name);
    }
    has(name) {
        return this.registry.has(name);
    }
}
//# sourceMappingURL=moduleRegistry.js.map