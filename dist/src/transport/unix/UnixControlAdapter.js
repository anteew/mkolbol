// UnixControlAdapter: control-plane pub/sub + heartbeats over Unix sockets
import { Socket, createServer } from 'node:net';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export class UnixControlAdapter {
    handlers = new Map();
    socket;
    server;
    heartbeatInterval;
    socketPath;
    isServer;
    closed = false;
    constructor(socketPath, isServer) {
        this.socketPath = socketPath;
        this.isServer = isServer;
        if (isServer) {
            this.startServer();
        }
        else {
            this.connectClient();
        }
        this.startHeartbeat();
    }
    startServer() {
        mkdirSync(dirname(this.socketPath), { recursive: true });
        this.server = createServer((socket) => {
            this.socket = socket;
            this.setupSocket(socket);
        });
        this.server.listen(this.socketPath);
    }
    connectClient() {
        this.socket = new Socket();
        this.socket.connect(this.socketPath);
        this.setupSocket(this.socket);
    }
    setupSocket(socket) {
        let buffer = '';
        socket.on('data', (chunk) => {
            buffer += chunk.toString();
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                try {
                    const msg = JSON.parse(line);
                    if (msg?.type === 'control' && msg?.topic) {
                        this.handleIncoming(msg.topic, msg.data);
                    }
                }
                catch {
                    // Ignore malformed messages
                }
            }
        });
        socket.on('error', () => {
            // Suppress errors during shutdown
        });
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (!this.closed) {
                this.publish('control.heartbeat', { ts: Date.now() });
            }
        }, 1000);
    }
    publish(topic, data) {
        if (this.closed || !this.socket || this.socket.destroyed) {
            return;
        }
        const msg = { type: 'control', topic, data };
        const payload = JSON.stringify(msg) + '\n';
        try {
            this.socket.write(payload);
        }
        catch {
            // Ignore write errors
        }
    }
    subscribe(topic, handler) {
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, new Set());
        }
        this.handlers.get(topic).add(handler);
        return () => {
            this.handlers.get(topic)?.delete(handler);
        };
    }
    handleIncoming(topic, data) {
        const handlers = this.handlers.get(topic);
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }
    shutdown() {
        if (this.closed) {
            return;
        }
        this.publish('control.shutdown', { ts: Date.now() });
        setTimeout(() => {
            this.close();
        }, 100);
    }
    close() {
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
//# sourceMappingURL=UnixControlAdapter.js.map