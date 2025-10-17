import { Duplex } from 'stream';
export interface TCPPipeOptions {
    host?: string;
    port: number;
    timeout?: number;
}
export declare class TCPPipeClient extends Duplex {
    private options;
    private socket?;
    private buffer;
    private sequenceId;
    constructor(options: TCPPipeOptions);
    connect(): Promise<void>;
    _write(chunk: any, _: BufferEncoding, cb: (error?: Error | null) => void): void;
    _read(): void;
    private handleData;
    close(): void;
    _final(cb: (error?: Error | null) => void): void;
}
export declare class TCPPipeServer {
    private options;
    private server?;
    private connections;
    constructor(options: TCPPipeOptions);
    listen(callback: (stream: Duplex) => void): Promise<number>;
    close(): Promise<void>;
}
//# sourceMappingURL=TCPPipe.d.ts.map