import type { Frame } from './transport.js';
export declare class FrameCodec {
    private static readonly HEADER_SIZE;
    private static readonly MAX_PAYLOAD_SIZE;
    static encode(frame: Frame): Buffer;
    static decode(buffer: Buffer): {
        frame: Frame;
        bytesConsumed: number;
    } | null;
    static createDataFrame(payload: Buffer | string, sequenceId?: number): Frame;
    static createPingFrame(): Frame;
    static createPongFrame(): Frame;
    static createCloseFrame(): Frame;
}
//# sourceMappingURL=frame.d.ts.map