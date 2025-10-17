import { Duplex } from 'stream';
import WebSocket, { WebSocketServer } from 'ws';
import { FrameCodec } from '../../net/frame.js';
import type { Frame } from '../../net/transport.js';
import { debug } from '../../debug/api.js';

export interface WebSocketPipeOptions {
  host?: string;
  port: number;
  path?: string;
  objectMode?: boolean;
  timeout?: number;
}

export class WebSocketPipeClient extends Duplex {
  private ws?: WebSocket;
  private buffer: Buffer = Buffer.alloc(0);
  private sequenceId = 0;

  constructor(private options: WebSocketPipeOptions) {
    super({ objectMode: options.objectMode ?? false });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const host = this.options.host || 'localhost';
      const port = this.options.port;
      const path = this.options.path || '/';
      const url = `ws://${host}:${port}${path}`;

      this.ws = new WebSocket(url);

      if (this.options.timeout) {
        const timeout = setTimeout(() => {
          this.ws?.terminate();
          reject(new Error('Connection timeout'));
        }, this.options.timeout);

        this.ws.on('open', () => {
          clearTimeout(timeout);
        });
      }

      this.ws.on('open', () => {
        debug.emit('ws-pipe', 'client.connect', { url }, 'info');
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleIncomingData(data);
      });

      this.ws.on('error', (err) => {
        debug.emit('ws-pipe', 'client.error', { error: err.message }, 'error');
        reject(err);
      });

      this.ws.on('close', () => {
        debug.emit('ws-pipe', 'client.close', {}, 'info');
        this.push(null);
      });
    });
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      callback(new Error('WebSocket not connected'));
      return;
    }

    try {
      const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
      const encoded = FrameCodec.encode(frame);
      this.ws.send(encoded, callback);
    } catch (err) {
      callback(err as Error);
    }
  }

  _read(size: number): void {
    // Backpressure handled by WebSocket
  }

  private handleIncomingData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const pong = FrameCodec.createPongFrame();
      const encoded = FrameCodec.encode(pong);
      this.ws.send(encoded);
    }
  }

  close(): void {
    if (this.ws) {
      const closeFrame = FrameCodec.createCloseFrame();
      const encoded = FrameCodec.encode(closeFrame);
      this.ws.send(encoded, () => {
        this.ws?.close();
      });
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    this.close();
    callback();
  }
}

export class WebSocketPipeServer {
  private server?: WebSocketServer;
  private connections: Set<WebSocket> = new Set();

  constructor(private options: WebSocketPipeOptions) {}

  listen(callback: (stream: Duplex) => void): Promise<number> {
    return new Promise((resolve, reject) => {
      const port = this.options.port;
      const path = this.options.path || '/';

      this.server = new WebSocketServer({ port, path });

      this.server.on('connection', (ws) => {
        const remoteAddress = (ws as any)._socket?.remoteAddress || 'unknown';
        debug.emit('ws-pipe', 'server.connection', { remoteAddress }, 'info');
        this.connections.add(ws);

        const pipe = new WebSocketServerPipe(ws);
        callback(pipe);

        ws.on('close', () => {
          this.connections.delete(ws);
        });
      });

      this.server.on('error', (err) => {
        debug.emit('ws-pipe', 'server.error', { error: err.message }, 'error');
        reject(err);
      });

      this.server.on('listening', () => {
        const address = this.server!.address();
        const actualPort = address && typeof address === 'object' ? address.port : port;
        debug.emit('ws-pipe', 'server.listen', { port: actualPort }, 'info');
        resolve(actualPort);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      for (const ws of this.connections) {
        ws.close();
      }
      this.connections.clear();

      if (this.server) {
        this.server.close(() => {
          debug.emit('ws-pipe', 'server.close', {}, 'info');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

class WebSocketServerPipe extends Duplex {
  private buffer: Buffer = Buffer.alloc(0);
  private sequenceId = 0;

  constructor(private ws: WebSocket) {
    super({ objectMode: false });

    ws.on('message', (data: Buffer) => {
      this.handleIncomingData(data);
    });

    ws.on('close', () => {
      this.push(null);
    });

    ws.on('error', (err) => {
      this.emit('error', err);
    });
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      callback(new Error('WebSocket not open'));
      return;
    }

    try {
      const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
      const encoded = FrameCodec.encode(frame);
      this.ws.send(encoded, callback);
    } catch (err) {
      callback(err as Error);
    }
  }

  _read(size: number): void {
    // Backpressure handled by WebSocket
  }

  private handleIncomingData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

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
    if (this.ws.readyState === WebSocket.OPEN) {
      const pong = FrameCodec.createPongFrame();
      const encoded = FrameCodec.encode(pong);
      this.ws.send(encoded);
    }
  }
}
