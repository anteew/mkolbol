import { Duplex } from 'stream';
import WebSocket, { WebSocketServer } from 'ws';
import { FrameCodec } from '../../net/frame.js';
import { debug } from '../../debug/api.js';
export class WebSocketPipeClient extends Duplex {
    options;
    ws;
    buffer = Buffer.alloc(0);
    sequenceId = 0;
    constructor(options) {
        super({ objectMode: options.objectMode ?? false });
        this.options = options;
    }
    connect() {
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
            this.ws.on('message', (data) => {
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
    _write(chunk, encoding, callback) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            callback(new Error('WebSocket not connected'));
            return;
        }
        try {
            const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
            const encoded = FrameCodec.encode(frame);
            this.ws.send(encoded, callback);
        }
        catch (err) {
            callback(err);
        }
    }
    _read(size) {
        // Backpressure handled by WebSocket
    }
    handleIncomingData(data) {
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
            }
            else if (frame.metadata.type === 'ping') {
                this.sendPong();
            }
            else if (frame.metadata.type === 'close') {
                this.push(null);
            }
        }
    }
    sendPong() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const pong = FrameCodec.createPongFrame();
            const encoded = FrameCodec.encode(pong);
            this.ws.send(encoded);
        }
    }
    close() {
        if (this.ws) {
            const closeFrame = FrameCodec.createCloseFrame();
            const encoded = FrameCodec.encode(closeFrame);
            this.ws.send(encoded, () => {
                this.ws?.close();
            });
        }
    }
    _final(callback) {
        this.close();
        callback();
    }
}
export class WebSocketPipeServer {
    options;
    server;
    connections = new Set();
    constructor(options) {
        this.options = options;
    }
    listen(callback) {
        return new Promise((resolve, reject) => {
            const port = this.options.port;
            const path = this.options.path || '/';
            this.server = new WebSocketServer({ port, path });
            this.server.on('connection', (ws) => {
                const remoteAddress = ws._socket?.remoteAddress || 'unknown';
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
                const address = this.server.address();
                const actualPort = (address && typeof address === 'object') ? address.port : port;
                debug.emit('ws-pipe', 'server.listen', { port: actualPort }, 'info');
                resolve(actualPort);
            });
        });
    }
    close() {
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
            }
            else {
                resolve();
            }
        });
    }
}
class WebSocketServerPipe extends Duplex {
    ws;
    buffer = Buffer.alloc(0);
    sequenceId = 0;
    constructor(ws) {
        super({ objectMode: false });
        this.ws = ws;
        ws.on('message', (data) => {
            this.handleIncomingData(data);
        });
        ws.on('close', () => {
            this.push(null);
        });
        ws.on('error', (err) => {
            this.emit('error', err);
        });
    }
    _write(chunk, encoding, callback) {
        if (this.ws.readyState !== WebSocket.OPEN) {
            callback(new Error('WebSocket not open'));
            return;
        }
        try {
            const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
            const encoded = FrameCodec.encode(frame);
            this.ws.send(encoded, callback);
        }
        catch (err) {
            callback(err);
        }
    }
    _read(size) {
        // Backpressure handled by WebSocket
    }
    handleIncomingData(data) {
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
            }
            else if (frame.metadata.type === 'ping') {
                this.sendPong();
            }
            else if (frame.metadata.type === 'close') {
                this.push(null);
            }
        }
    }
    sendPong() {
        if (this.ws.readyState === WebSocket.OPEN) {
            const pong = FrameCodec.createPongFrame();
            const encoded = FrameCodec.encode(pong);
            this.ws.send(encoded);
        }
    }
}
//# sourceMappingURL=WebSocketPipe.js.map