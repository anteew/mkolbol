import { Duplex } from 'stream';
import { FrameCodec } from './frame.js';
export class FrameMux {
    transport;
    streams = new Map();
    nextStreamId = 1;
    constructor(transport) {
        this.transport = transport;
        transport.on('data', (chunk) => this.handleTransportData(chunk));
    }
    createStream() {
        const streamId = this.nextStreamId++;
        const stream = new MuxStream(streamId, this);
        this.streams.set(streamId, stream);
        return stream;
    }
    closeStream(streamId) {
        this.streams.delete(streamId);
    }
    writeFrame(streamId, data) {
        const frame = FrameCodec.createDataFrame(data);
        const muxFrame = { ...frame, streamId };
        const encoded = this.encodeMuxFrame(muxFrame);
        this.transport.write(encoded);
    }
    handleTransportData(chunk) {
        const decoded = this.decodeMuxFrame(chunk);
        if (decoded) {
            const stream = this.streams.get(decoded.streamId);
            if (stream && decoded.metadata.type === 'data') {
                stream.push(decoded.payload);
            }
        }
    }
    encodeMuxFrame(frame) {
        const streamIdBuf = Buffer.allocUnsafe(4);
        streamIdBuf.writeUInt32BE(frame.streamId, 0);
        const frameData = FrameCodec.encode(frame);
        return Buffer.concat([streamIdBuf, frameData]);
    }
    decodeMuxFrame(buffer) {
        if (buffer.length < 4)
            return null;
        const streamId = buffer.readUInt32BE(0);
        const frameResult = FrameCodec.decode(buffer.slice(4));
        if (!frameResult)
            return null;
        return { ...frameResult.frame, streamId };
    }
}
class MuxStream extends Duplex {
    streamId;
    mux;
    constructor(streamId, mux) {
        super({ objectMode: false });
        this.streamId = streamId;
        this.mux = mux;
    }
    _write(chunk, _, cb) {
        this.mux.writeFrame(this.streamId, Buffer.from(chunk));
        cb();
    }
    _read() { }
    _final(cb) {
        this.mux.closeStream(this.streamId);
        cb();
    }
}
//# sourceMappingURL=mux.js.map