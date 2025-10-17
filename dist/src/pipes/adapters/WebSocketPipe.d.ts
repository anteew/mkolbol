import { Duplex } from 'stream';
export interface WebSocketPipeOptions {
    host?: string;
    port: number;
    path?: string;
    objectMode?: boolean;
    timeout?: number;
}
export declare class WebSocketPipeClient extends Duplex {
    private options;
    private ws?;
    private buffer;
    private sequenceId;
    constructor(options: WebSocketPipeOptions);
    connect(): Promise<void>;
    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
    _read(_size: number): void;
    private handleIncomingData;
    private sendPong;
    close(): void;
    _final(callback: (error?: Error | null) => void): void;
}
export declare class WebSocketPipeServer {
    private options;
    private server?;
    private connections;
    constructor(options: WebSocketPipeOptions);
    listen(callback: (stream: Duplex) => void): Promise<number>;
    close(): Promise<void>;
}
//# sourceMappingURL=WebSocketPipe.d.ts.map