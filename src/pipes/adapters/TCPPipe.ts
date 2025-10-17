import { Duplex } from 'stream';
import { Socket, createServer, Server } from 'net';
import { FrameCodec } from '../../net/frame.js';

export interface TCPPipeOptions {
  host?: string;
  port: number;
  timeout?: number;
}

export class TCPPipeClient extends Duplex {
  private socket?: Socket;
  private buffer = Buffer.alloc(0);
  private sequenceId = 0;

  constructor(private options: TCPPipeOptions) {
    super({ objectMode: false });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new Socket();
      if (this.options.timeout) this.socket.setTimeout(this.options.timeout);

      this.socket.on('connect', () => resolve());
      this.socket.on('data', (chunk: Buffer) => this.handleData(chunk));
      this.socket.on('error', (err) => reject(err));
      this.socket.on('close', () => this.push(null));

      this.socket.connect(this.options.port, this.options.host || 'localhost');
    });
  }

  _write(chunk: any, _: BufferEncoding, cb: (error?: Error | null) => void): void {
    if (!this.socket) return cb(new Error('Not connected'));
    const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
    this.socket.write(FrameCodec.encode(frame), cb);
  }

  _read(): void {}

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length > 0) {
      const result = FrameCodec.decode(this.buffer);
      if (!result) break;
      this.buffer = this.buffer.slice(result.bytesConsumed);
      if (result.frame.metadata.type === 'data') this.push(result.frame.payload);
    }
  }

  close(): void {
    if (this.socket) this.socket.end();
  }

  _final(cb: (error?: Error | null) => void): void {
    this.close();
    cb();
  }
}

export class TCPPipeServer {
  private server?: Server;
  private connections = new Set<Socket>();

  constructor(private options: TCPPipeOptions) {}

  listen(callback: (stream: Duplex) => void): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((socket) => {
        this.connections.add(socket);
        const pipe = new TCPServerPipe(socket);
        callback(pipe);
        socket.on('close', () => this.connections.delete(socket));
      });

      this.server.on('error', reject);
      this.server.listen(this.options.port, () => {
        const addr = this.server!.address();
        resolve((addr && typeof addr === 'object') ? addr.port : this.options.port);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.connections.forEach(s => s.end());
      this.connections.clear();
      if (this.server) this.server.close(() => resolve());
      else resolve();
    });
  }
}

class TCPServerPipe extends Duplex {
  private buffer = Buffer.alloc(0);
  private sequenceId = 0;

  constructor(private socket: Socket) {
    super({ objectMode: false });
    socket.on('data', (c: Buffer) => this.handleData(c));
    socket.on('close', () => this.push(null));
    socket.on('error', (e) => this.emit('error', e));
  }

  _write(chunk: any, _: BufferEncoding, cb: (error?: Error | null) => void): void {
    this.socket.write(FrameCodec.encode(FrameCodec.createDataFrame(chunk, this.sequenceId++)), cb);
  }

  _read(): void {}

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length > 0) {
      const result = FrameCodec.decode(this.buffer);
      if (!result) break;
      this.buffer = this.buffer.slice(result.bytesConsumed);
      if (result.frame.metadata.type === 'data') this.push(result.frame.payload);
    }
  }
}
