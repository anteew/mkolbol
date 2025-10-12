import type { Pipe, StreamOptions, Capabilities, CapabilityQuery } from '../types/stream';
import type { PipeAdapter } from '../pipes/PipeAdapter';
import { InProcPipe } from '../pipes/adapters/InProcPipe.js';
import { debug } from '../debug/api.js';

export class Kernel {
  private registry = new Map<string, { capabilities: Capabilities; pipe: Pipe }>();
  private adapter: PipeAdapter;

  constructor(adapter?: PipeAdapter) {
    this.adapter = adapter ?? new InProcPipe();
  }

  createPipe(options?: StreamOptions): Pipe {
    const pipe = this.adapter.createDuplex(options);
    debug.emit('kernel', 'pipe.create', { pipeId: (pipe as any)._id });
    return pipe;
  }

  connect(from: Pipe, to: Pipe): void {
    debug.emit('kernel', 'pipe.connect', { fromId: (from as any)._id, toId: (to as any)._id });
    from.pipe(to);
  }

  split(source: Pipe, destinations: Pipe[]): void {
    debug.emit('kernel', 'pipe.split', {
      sourceId: (source as any)._id,
      destIds: destinations.map((d) => (d as any)._id),
    });
    for (const dest of destinations) {
      source.pipe(dest);
    }
  }

  merge(sources: Pipe[], destination: Pipe): void {
    debug.emit('kernel', 'pipe.merge', {
      sourceIds: sources.map((s) => (s as any)._id),
      destId: (destination as any)._id,
    });
    for (const source of sources) {
      source.pipe(destination);
    }
  }

  register(name: string, capabilities: Capabilities, pipe: Pipe): void {
    this.registry.set(name, { capabilities, pipe });
  }

  lookup(query: CapabilityQuery): Pipe[] {
    const results: Pipe[] = [];
    for (const entry of this.registry.values()) {
      const caps = entry.capabilities;
      if (query.accepts && caps.accepts && !caps.accepts.includes(query.accepts)) continue;
      if (query.produces && caps.produces && !caps.produces.includes(query.produces)) continue;
      if (query.features) {
        if (!caps.features) continue;
        const hasAll = query.features.every(f => caps.features!.includes(f));
        if (!hasAll) continue;
      }
      results.push(entry.pipe);
    }
    return results;
  }
}
