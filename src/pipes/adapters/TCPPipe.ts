import { Duplex } from 'stream';
import { Socket, createServer, Server } from 'net';
import { FrameCodec } from '../../net/frame.js';
import type { Frame } from '../../net/transport.js';
import { debug } from '../../debug/api.js';

export interface TCPPipeOptions {
  host?: string;
  port: number;
  objectMode?: boolean;
  timeout?: number;
}

export class TCPPipeClient extends Duplex {
  private socket?: Socket;
  private buffer: Buffer = Buffer.alloc(0);
  private sequenceId = 0;

  constructor(private options: TCPPipeOptions) {
    super({ objectMode: options.objectMode ?? false });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const host = this.options.host || 'localhost';
      const port = this.options.port;

      this.socket = new Socket();

      if (this.options.timeout) {
        this.socket.setTimeout(this.options.timeout);
      }

      this.socket.on('connect', () => {
        debug.emit('tcp-pipe', 'client.connect', { host, port }, 'info');
        resolve();
      });

      this.socket.on('data', (chunk: Buffer) => {
        this.handleIncomingData(chunk);
      });

      this.socket.on('error', (err) => {
        debug.emit('tcp-pipe', 'client.error', { error: err.message }, 'error');
        reject(err);
      });

      this.socket.on('close', () => {
        debug.emit('tcp-pipe', 'client.close', {}, 'info');
        this.push(null);
      });

      this.socket.connect(port, host);
    });
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (!this.socket) {
      callback(new Error('Not connected'));
      return;
    }

    try {
      const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
      const encoded = FrameCodec.encode(frame);
      this.socket.write(encoded, callback);
    } catch (err) {
      callback(err as Error);
    }
  }

  _read(size: number): void {
    // Backpressure handled by socket
  }

  private handleIncomingData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length > 0) {
      const result = FrameCodec.decode(this.buffer);

      if (!result) {
        break;
      }

      const { frame, bytesConsumed } = result;
      this.buffer = this.buffer.slice(bytesConsumed);

      if (frame.metadata.type === 'data') {
        this.push(frame.payload);
      } else if (frame.metadata.type === 'ping') {
        this.sendPong();
      } else if (frame.metadata.type === 'close') {
        this.push(null);
      }
    }
  }

  private sendPong(): void {
    if (this.socket) {
      const pong = FrameCodec.createPongFrame();
      const encoded = FrameCodec.encode(pong);
      this.socket.write(encoded);
    }
  }

  close(): void {
    if (this.socket) {
      const closeFrame = FrameCodec.createCloseFrame();
      const encoded = FrameCodec.encode(closeFrame);
      this.socket.write(encoded, () => {
        this.socket?.end();
      });
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    this.close();
    callback();
  }
}

export class TCPPipeServer {
  private server?: Server;
  private connections: Set<Socket> = new Set();

  constructor(private options: TCPPipeOptions) {}

  listen(callback: (stream: Duplex) => void): Promise<number> {
    return new Promise((resolve, reject) => {
      const port = this.options.port;

      this.server = createServer((socket) => {
        debug.emit('tcp-pipe', 'server.connection', { remoteAddress: socket.remoteAddress }, 'info');
        this.connections.add(socket);

        const pipe = new TCPServerPipe(socket);
        callback(pipe);

        socket.on('close', () => {
          this.connections.delete(socket);
        });
      });

      this.server.on('error', (err) => {
        debug.emit('tcp-pipe', 'server.error', { error: err.message }, 'error');
        reject(err);
      });

      this.server.listen(port, () => {
        const address = this.server!.address();
        const actualPort = (address && typeof address === 'object') ? address.port : port;
        debug.emit('tcp-pipe', 'server.listen', { port: actualPort }, 'info');
        resolve(actualPort);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      for (const socket of this.connections) {
        socket.end();
      }
      this.connections.clear();

      if (this.server) {
        this.server.close(() => {
          debug.emit('tcp-pipe', 'server.close', {}, 'info');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

class TCPServerPipe extends Duplex {
  private buffer: Buffer = Buffer.alloc(0);
  private sequenceId = 0;

  constructor(private socket: Socket) {
    super({ objectMode: false });

    socket.on('data', (chunk: Buffer) => {
      this.handleIncomingData(chunk);
    });

    socket.on('close', () => {
      this.push(null);
    });

    socket.on('error', (err) => {
      this.emit('error', err);
    });
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    try {
      const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
      const encoded = FrameCodec.encode(frame);
      this.socket.write(encoded, callback);
    } catch (err) {
      callback(err as Error);
    }
  }

  _read(size: number): void {
    // Backpressure handled by socket
  }

  private handleIncomingData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length > 0) {
      const result = FrameCodec.decode(this.buffer);

      if (!result) {
        break;
      }

      const { frame, bytesConsumed } = result;
      this.buffer = this.buffer.slice(bytesConsumed);

      if (frame.metadata.type === 'data') {
        this.push(frame.payload);
      } else if (frame.metadata.type === 'ping') {
        this.sendPong();
      } else if (frame.metadata.type === 'close') {
        this.push(null);
      }
    }
  }

  private sendPong(): void {
    const pong = FrameCodec.createPongFrame();
    const encoded = FrameCodec.encode(pong);
    this.socket.write(encoded);
  }
}
