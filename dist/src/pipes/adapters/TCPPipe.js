import { Duplex } from 'stream';
import { Socket, createServer } from 'net';
import { FrameCodec } from '../../net/frame.js';
export class TCPPipeClient extends Duplex {
    options;
    socket;
    buffer = Buffer.alloc(0);
    sequenceId = 0;
    constructor(options) {
        super({ objectMode: false });
        this.options = options;
    }
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = new Socket();
            if (this.options.timeout)
                this.socket.setTimeout(this.options.timeout);
            this.socket.on('connect', () => resolve());
            this.socket.on('data', (chunk) => this.handleData(chunk));
            this.socket.on('error', (err) => reject(err));
            this.socket.on('close', () => this.push(null));
            this.socket.connect(this.options.port, this.options.host || 'localhost');
        });
    }
    _write(chunk, _, cb) {
        if (!this.socket)
            return cb(new Error('Not connected'));
        const frame = FrameCodec.createDataFrame(chunk, this.sequenceId++);
        this.socket.write(FrameCodec.encode(frame), cb);
    }
    _read() { }
    handleData(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        while (this.buffer.length > 0) {
            const result = FrameCodec.decode(this.buffer);
            if (!result)
                break;
            this.buffer = this.buffer.slice(result.bytesConsumed);
            if (result.frame.metadata.type === 'data')
                this.push(result.frame.payload);
        }
    }
    close() {
        if (this.socket)
            this.socket.end();
    }
    _final(cb) {
        this.close();
        cb();
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
            this.server = createServer((socket) => {
                this.connections.add(socket);
                const pipe = new TCPServerPipe(socket);
                callback(pipe);
                socket.on('close', () => this.connections.delete(socket));
            });
            this.server.on('error', reject);
            this.server.listen(this.options.port, () => {
                const addr = this.server.address();
                resolve((addr && typeof addr === 'object') ? addr.port : this.options.port);
            });
        });
    }
    close() {
        return new Promise((resolve) => {
            this.connections.forEach(s => s.end());
            this.connections.clear();
            if (this.server)
                this.server.close(() => resolve());
            else
                resolve();
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
        socket.on('data', (c) => this.handleData(c));
        socket.on('close', () => this.push(null));
        socket.on('error', (e) => this.emit('error', e));
    }
    _write(chunk, _, cb) {
        this.socket.write(FrameCodec.encode(FrameCodec.createDataFrame(chunk, this.sequenceId++)), cb);
    }
    _read() { }
    handleData(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        while (this.buffer.length > 0) {
            const result = FrameCodec.decode(this.buffer);
            if (!result)
                break;
            this.buffer = this.buffer.slice(result.bytesConsumed);
            if (result.frame.metadata.type === 'data')
                this.push(result.frame.payload);
        }
    }
}
//# sourceMappingURL=TCPPipe.js.map