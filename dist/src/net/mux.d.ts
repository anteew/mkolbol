import { Duplex } from 'stream';
import type { Frame } from './transport.js';
export interface MuxFrame extends Frame {
    streamId: number;
}
export declare class FrameMux {
    private transport;
    private streams;
    private nextStreamId;
    constructor(transport: Duplex);
    createStream(): Duplex;
    closeStream(streamId: number): void;
    writeFrame(streamId: number, data: Buffer): void;
    private handleTransportData;
    private encodeMuxFrame;
    private decodeMuxFrame;
}
//# sourceMappingURL=mux.d.ts.map