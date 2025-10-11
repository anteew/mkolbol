import { Duplex } from 'node:stream';
import { Kernel } from '../kernel/Kernel.js';
import { NodeDef, TerminalRef, PipeOptions, ConnectionMetadata, TopologySnapshot, TopologyEvent, ValidationResult } from '../types/topology.js';
type ValidatorFn = (from: TerminalRef, tos: TerminalRef[], type: 'direct' | 'split' | 'merge') => ValidationResult;
export declare class StateManager {
    private kernel;
    private nodes;
    private pipes;
    private connections;
    private listeners;
    private validator?;
    constructor(kernel: Kernel);
    subscribe(fn: (e: TopologyEvent) => void): () => void;
    private emit;
    addNode(manifest: Partial<NodeDef>): NodeDef;
    createPipe(addrOrRef: string | TerminalRef, options?: PipeOptions): Duplex;
    connect(from: string | TerminalRef, to: string | TerminalRef): ConnectionMetadata;
    split(source: string | TerminalRef, destinations: (string | TerminalRef)[]): ConnectionMetadata[];
    merge(sources: (string | TerminalRef)[], destination: string | TerminalRef): ConnectionMetadata[];
    setValidator(fn: ValidatorFn): void;
    private validate;
    getTopology(): TopologySnapshot;
    exportJSON(): string;
    exportMermaid(): string;
    exportDOT(): string;
    private parseAddress;
    private genId;
}
export {};
//# sourceMappingURL=StateManager.d.ts.map