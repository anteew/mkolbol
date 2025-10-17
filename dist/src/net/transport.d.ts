import type { Duplex } from 'stream';
export interface TransportOptions {
    objectMode?: boolean;
    highWaterMark?: number;
    encoding?: BufferEncoding;
}
export interface Transport {
    createConnection(options: any): Duplex;
    createServer(options: any, callback: (stream: Duplex) => void): any;
    close(): Promise<void>;
}
export interface FrameMetadata {
    type: 'data' | 'ping' | 'pong' | 'close';
    timestamp?: number;
    sequenceId?: number;
}
export interface Frame {
    metadata: FrameMetadata;
    payload: Buffer;
}
//# sourceMappingURL=transport.d.ts.map