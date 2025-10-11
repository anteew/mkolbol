import { PassThrough } from 'stream';
export class Kernel {
    registry = new Map();
    createPipe(options) {
        return new PassThrough(options);
    }
    connect(from, to) {
        from.pipe(to);
    }
    split(source, destinations) {
        for (const dest of destinations) {
            source.pipe(dest);
        }
    }
    merge(sources, destination) {
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
                const hasAll = query.features.every(f => caps.features.includes(f));
                if (!hasAll)
                    continue;
            }
            results.push(entry.pipe);
        }
        return results;
    }
}
//# sourceMappingURL=Kernel.js.map