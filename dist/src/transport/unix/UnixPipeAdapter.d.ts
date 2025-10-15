import type { Pipe, StreamOptions } from '../../types/stream.js';
interface ProcessPipeAdapter {
    createDuplex(options?: StreamOptions): Pipe;
    listen(): Promise<void>;
    connect(): Promise<void>;
    close(): void;
}
export declare class UnixPipeAdapter implements ProcessPipeAdapter {
    private socketPath;
    private server?;
    private socket?;
    private isListening;
    private isConnected;
    constructor(socketPath: string);
    listen(): Promise<void>;
    connect(): Promise<void>;
    createDuplex(options?: StreamOptions): Pipe;
    close(): void;
}
export {};
//# sourceMappingURL=UnixPipeAdapter.d.ts.map