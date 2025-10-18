import { Duplex } from 'stream';
import { FrameCodec } from './frame.js';
import type { Frame } from './transport.js';

export interface MuxFrame extends Frame {
  streamId: number;
}

export class FrameMux {
  private streams = new Map<number, Duplex>();
  private nextStreamId = 1;

  constructor(private transport: Duplex) {
    transport.on('data', (chunk: Buffer) => this.handleTransportData(chunk));
  }

  createStream(): Duplex {
    const streamId = this.nextStreamId++;
    const stream = new MuxStream(streamId, this);
    this.streams.set(streamId, stream);
    return stream;
  }

  closeStream(streamId: number): void {
    this.streams.delete(streamId);
  }

  writeFrame(streamId: number, data: Buffer): void {
    const frame = FrameCodec.createDataFrame(data);
    const muxFrame: MuxFrame = { ...frame, streamId };
    const encoded = this.encodeMuxFrame(muxFrame);
    this.transport.write(encoded);
  }

  private handleTransportData(chunk: Buffer): void {
    const decoded = this.decodeMuxFrame(chunk);
    if (decoded) {
      const stream = this.streams.get(decoded.streamId);
      if (stream && decoded.metadata.type === 'data') {
        stream.push(decoded.payload);
      }
    }
  }

  private encodeMuxFrame(frame: MuxFrame): Buffer {
    const streamIdBuf = Buffer.allocUnsafe(4);
    streamIdBuf.writeUInt32BE(frame.streamId, 0);
    const frameData = FrameCodec.encode(frame);
    return Buffer.concat([streamIdBuf, frameData]);
  }

  private decodeMuxFrame(buffer: Buffer): MuxFrame | null {
    if (buffer.length < 4) return null;
    const streamId = buffer.readUInt32BE(0);
    const frameResult = FrameCodec.decode(buffer.slice(4));
    if (!frameResult) return null;
    return { ...frameResult.frame, streamId };
  }
}

class MuxStream extends Duplex {
  constructor(private streamId: number, private mux: FrameMux) {
    super({ objectMode: false });
  }

  _write(chunk: any, _: BufferEncoding, cb: (error?: Error | null) => void): void {
    this.mux.writeFrame(this.streamId, Buffer.from(chunk));
    cb();
  }

  _read(): void {}

  _final(cb: () => void): void {
    this.mux.closeStream(this.streamId);
    cb();
  }
}
