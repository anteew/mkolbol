export class FrameCodec {
    static HEADER_SIZE = 8;
    static MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
    static encode(frame) {
        const metadataJson = JSON.stringify(frame.metadata);
        const metadataBuffer = Buffer.from(metadataJson, 'utf8');
        const metadataLength = metadataBuffer.length;
        const payloadLength = frame.payload.length;
        if (payloadLength > this.MAX_PAYLOAD_SIZE) {
            throw new Error(`Payload exceeds maximum size: ${payloadLength} > ${this.MAX_PAYLOAD_SIZE}`);
        }
        const headerBuffer = Buffer.allocUnsafe(this.HEADER_SIZE);
        headerBuffer.writeUInt32BE(metadataLength, 0);
        headerBuffer.writeUInt32BE(payloadLength, 4);
        return Buffer.concat([headerBuffer, metadataBuffer, frame.payload]);
    }
    static decode(buffer) {
        if (buffer.length < this.HEADER_SIZE) {
            return null;
        }
        const metadataLength = buffer.readUInt32BE(0);
        const payloadLength = buffer.readUInt32BE(4);
        const totalLength = this.HEADER_SIZE + metadataLength + payloadLength;
        if (buffer.length < totalLength) {
            return null;
        }
        if (payloadLength > this.MAX_PAYLOAD_SIZE) {
            throw new Error(`Payload exceeds maximum size: ${payloadLength} > ${this.MAX_PAYLOAD_SIZE}`);
        }
        const metadataBuffer = buffer.slice(this.HEADER_SIZE, this.HEADER_SIZE + metadataLength);
        const payloadBuffer = buffer.slice(this.HEADER_SIZE + metadataLength, totalLength);
        const metadata = JSON.parse(metadataBuffer.toString('utf8'));
        return {
            frame: { metadata, payload: payloadBuffer },
            bytesConsumed: totalLength
        };
    }
    static createDataFrame(payload, sequenceId) {
        const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
        return {
            metadata: {
                type: 'data',
                timestamp: Date.now(),
                sequenceId
            },
            payload: payloadBuffer
        };
    }
    static createPingFrame() {
        return {
            metadata: {
                type: 'ping',
                timestamp: Date.now()
            },
            payload: Buffer.alloc(0)
        };
    }
    static createPongFrame() {
        return {
            metadata: {
                type: 'pong',
                timestamp: Date.now()
            },
            payload: Buffer.alloc(0)
        };
    }
    static createCloseFrame() {
        return {
            metadata: {
                type: 'close',
                timestamp: Date.now()
            },
            payload: Buffer.alloc(0)
        };
    }
}
//# sourceMappingURL=frame.js.map