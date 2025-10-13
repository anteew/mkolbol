import { TimerSource } from '../modules/timer.js';
import { UppercaseTransform } from '../modules/uppercase.js';
import { ConsoleSink } from '../modules/consoleSink.js';
export class ModuleRegistry {
    registry = new Map();
    constructor() {
        this.register('TimerSource', TimerSource);
        this.register('UppercaseTransform', UppercaseTransform);
        this.register('ConsoleSink', ConsoleSink);
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