import { Duplex } from 'stream';
import { Socket, createServer } from 'net';
import { FrameCodec } from '../../net/frame.js';
import { debug } from '../../debug/api.js';
export class TCPPipeClient extends Duplex {
    options;
    socket;
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
            this.socket = new Socket();
            if (this.options.timeout) {
                this.socket.setTimeout(this.options.timeout);
            }
            this.socket.on('connect', () => {
                debug.emit('tcp-pipe', 'client.connect', { host, port }, 'info');
                resolve();
            });
            this.socket.on('data', (chunk) => {
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
    _write(chunk, encoding, callback) {
        if (!this.socket) {
            callback(new Error('Not connected'));
            return;
        }
        try {
            const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
            const encoded = FrameCodec.encode(frame);
            this.socket.write(encoded, callback);
        }
        catch (err) {
            callback(err);
        }
    }
    _read(size) {
        // Backpressure handled by socket
    }
    handleIncomingData(chunk) {
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
        if (this.socket) {
            const pong = FrameCodec.createPongFrame();
            const encoded = FrameCodec.encode(pong);
            this.socket.write(encoded);
        }
    }
    close() {
        if (this.socket) {
            const closeFrame = FrameCodec.createCloseFrame();
            const encoded = FrameCodec.encode(closeFrame);
            this.socket.write(encoded, () => {
                this.socket?.end();
            });
        }
    }
    _final(callback) {
        this.close();
        callback();
    }
}
export class TCPPipeServer {
    options;
    server;
    connections = new Set();
    constructor(options) {
        this.options = options;
    }
    listen(callback) {
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
                const address = this.server.address();
                const actualPort = (address && typeof address === 'object') ? address.port : port;
                debug.emit('tcp-pipe', 'server.listen', { port: actualPort }, 'info');
                resolve(actualPort);
            });
        });
    }
    close() {
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
            }
            else {
                resolve();
            }
        });
    }
}
class TCPServerPipe extends Duplex {
    socket;
    buffer = Buffer.alloc(0);
    sequenceId = 0;
    constructor(socket) {
        super({ objectMode: false });
        this.socket = socket;
        socket.on('data', (chunk) => {
            this.handleIncomingData(chunk);
        });
        socket.on('close', () => {
            this.push(null);
        });
        socket.on('error', (err) => {
            this.emit('error', err);
        });
    }
    _write(chunk, encoding, callback) {
        try {
            const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
            const encoded = FrameCodec.encode(frame);
            this.socket.write(encoded, callback);
        }
        catch (err) {
            callback(err);
        }
    }
    _read(size) {
        // Backpressure handled by socket
    }
    handleIncomingData(chunk) {
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
        const pong = FrameCodec.createPongFrame();
        const encoded = FrameCodec.encode(pong);
        this.socket.write(encoded);
    }
}
//# sourceMappingURL=TCPPipe.js.map