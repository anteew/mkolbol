import { InProcPipe } from '../pipes/adapters/InProcPipe.js';
import { debug } from '../debug/api.js';
export class Kernel {
    registry = new Map();
    adapter;
    constructor(adapter) {
        this.adapter = adapter ?? new InProcPipe();
    }
    createPipe(options) {
        const pipe = this.adapter.createDuplex(options);
        debug.emit('kernel', 'pipe.create', { pipeId: pipe._id });
        return pipe;
    }
    connect(from, to) {
        debug.emit('kernel', 'pipe.connect', { fromId: from._id, toId: to._id });
        from.pipe(to);
    }
    split(source, destinations) {
        debug.emit('kernel', 'pipe.split', {
            sourceId: source._id,
            destIds: destinations.map((d) => d._id),
        });
        for (const dest of destinations) {
            source.pipe(dest);
        }
    }
    merge(sources, destination) {
        debug.emit('kernel', 'pipe.merge', {
            sourceIds: sources.map((s) => s._id),
            destId: destination._id,
        });
        for (const source of sources) {
            source.pipe(destination);
        }
    }
    register(name, capabilities, pipe) {
        this.registry.set(name, { capabilities, pipe });
    }
    lookup(query) {
        const results = [];
        for (const entry of this.registry.values()) {
            const caps = entry.capabilities;
            if (query.accepts && caps.accepts && !caps.accepts.includes(query.accepts))
                continue;
            if (query.produces && caps.produces && !caps.produces.includes(query.produces))
                continue;
            if (query.features) {
                if (!caps.features)
                    continue;
                const hasAll = query.features.every((f) => caps.features.includes(f));
                if (!hasAll)
                    continue;
            }
            results.push(entry.pipe);
        }
        return results;
    }
}
//# sourceMappingURL=Kernel.js.map