import type { Pipe, StreamOptions, Capabilities, CapabilityQuery } from '../types/stream';
import type { PipeAdapter } from '../pipes/PipeAdapter';
export declare class Kernel {
    private registry;
    private adapter;
    constructor(adapter?: PipeAdapter);
    createPipe(options?: StreamOptions): Pipe;
    connect(from: Pipe, to: Pipe): void;
    split(source: Pipe, destinations: Pipe[]): void;
    merge(sources: Pipe[], destination: Pipe): void;
    register(name: string, capabilities: Capabilities, pipe: Pipe): void;
    lookup(query: CapabilityQuery): Pipe[];
}
//# sourceMappingURL=Kernel.d.ts.map