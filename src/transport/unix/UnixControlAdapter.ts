// UnixControlAdapter: control-plane pub/sub + heartbeats over Unix sockets
import { Socket, Server, createServer } from 'node:net';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

interface ProcessControlAdapter {
  publish(topic: string, data: unknown): void;
  subscribe(topic: string, handler: (data: unknown) => void): () => void;
}

interface ControlMessage {
  type: 'control';
  topic: string;
  data: unknown;
}

export class UnixControlAdapter implements ProcessControlAdapter {
  private handlers = new Map<string, Set<(data: unknown) => void>>();
  private socket?: Socket;
  private server?: Server;
  private heartbeatInterval?: NodeJS.Timeout;
  private readonly socketPath: string;
  private readonly isServer: boolean;
  private closed = false;

  constructor(socketPath: string, isServer: boolean) {
    this.socketPath = socketPath;
    this.isServer = isServer;

    if (isServer) {
      this.startServer();
    } else {
      this.connectClient();
    }

    this.startHeartbeat();
  }

  private startServer(): void {
    mkdirSync(dirname(this.socketPath), { recursive: true });
    this.server = createServer((socket) => {
      this.socket = socket;
      this.setupSocket(socket);
    });
    this.server.listen(this.socketPath);
  }

  private connectClient(): void {
    this.socket = new Socket();
    this.socket.connect(this.socketPath);
    this.setupSocket(this.socket);
  }

  private setupSocket(socket: Socket): void {
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let newlineIndex: number;

      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        try {
          const msg = JSON.parse(line) as ControlMessage;
          if (msg?.type === 'control' && msg?.topic) {
            this.handleIncoming(msg.topic, msg.data);
          }
        } catch {
          // Ignore malformed messages
        }
      }
    });

    socket.on('error', (err) => {
      if (!this.closed) {
        this.handleIncoming('control.error', { error: err.message });
      }
    });

    socket.on('close', () => {
      if (!this.closed) {
        this.handleIncoming('control.close', {});
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.closed) {
        this.publish('control.heartbeat', { ts: Date.now() });
      }
    }, 1000);
  }

  publish(topic: string, data: unknown): void {
    if (this.closed || !this.socket || this.socket.destroyed) {
      return;
    }

    const msg: ControlMessage = { type: 'control', topic, data };
    const payload = JSON.stringify(msg) + '\n';

    try {
      const canContinue = this.socket.write(payload);
      if (!canContinue) {
        this.socket.once('drain', () => {});
      }
    } catch {
      // Ignore write errors
    }
  }

  subscribe(topic: string, handler: (data: unknown) => void): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);
    return () => {
      this.handlers.get(topic)?.delete(handler);
    };
  }

  private handleIncoming(topic: string, data: unknown): void {
    const handlers = this.handlers.get(topic);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  shutdown(): void {
    if (this.closed) {
      return;
    }

    this.publish('control.shutdown', { ts: Date.now() });

    setTimeout(() => {
      this.close();
    }, 100);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.socket && !this.socket.destroyed) {
      this.socket.end();
      this.socket.destroy();
    }

    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }
}
