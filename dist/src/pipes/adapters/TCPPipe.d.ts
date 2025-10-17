import { Duplex } from 'stream';
export interface TCPPipeOptions {
    host?: string;
    port: number;
    objectMode?: boolean;
    timeout?: number;
}
export declare class TCPPipeClient extends Duplex {
    private options;
    private socket?;
    private buffer;
    private sequenceId;
    constructor(options: TCPPipeOptions);
    connect(): Promise<void>;
    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
    _read(size: number): void;
    private handleIncomingData;
    private sendPong;
    close(): void;
    _final(callback: (error?: Error | null) => void): void;
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