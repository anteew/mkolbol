import { Duplex } from 'stream';
import { createServer, createConnection } from 'node:net';
class UnixPipeAdapterDuplex extends Duplex {
    socket;
    isClosing = false;
    constructor(options) {
        const { socket, ...streamOptions } = options;
        super(streamOptions);
        this.socket = socket;
        this.socket.on('data', (data) => {
            if (!this.push(data)) {
                this.socket.pause();
            }
        });
        this.socket.on('end', () => {
            this.push(null);
        });
        this.socket.on('error', (err) => {
            this.destroy(err);
        });
        this.socket.on('close', () => {
            if (!this.isClosing) {
                this.destroy();
            }
        });
    }
    _read(size) {
        this.socket.resume();
    }
    _write(chunk, encoding, callback) {
        const canContinue = this.socket.write(chunk, encoding, (err) => {
            if (err) {
                callback(err);
            }
        });
        if (canContinue) {
            callback();
        }
        else {
            this.socket.once('drain', () => {
                callback();
            });
        }
    }
    _final(callback) {
        this.socket.end(() => {
            callback();
        });
    }
    _destroy(error, callback) {
        this.isClosing = true;
        if (!this.socket.destroyed) {
            this.socket.destroy();
        }
        callback(error);
    }
}
export class UnixPipeAdapter {
    socketPath;
    server;
    socket;
    isListening = false;
    isConnected = false;
    constructor(socketPath) {
        this.socketPath = socketPath;
    }
    async listen() {
        if (this.isListening) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.server = createServer((socket) => {
                this.socket = socket;
            });
            this.server.on('error', (err) => {
                reject(err);
            });
            this.server.listen(this.socketPath, () => {
                this.isListening = true;
                resolve();
            });
        });
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        return new Promise((resolve, reject) => {
            const socket = createConnection(this.socketPath);
            socket.on('connect', () => {
                this.socket = socket;
                this.isConnected = true;
                resolve();
            });
            socket.on('error', (err) => {
                reject(err);
            });
        });
    }
    createDuplex(options) {
        if (!this.socket) {
            throw new Error('Socket not initialized. Call listen() or connect() first.');
        }
        return new UnixPipeAdapterDuplex({
            ...(options ?? {}),
            socket: this.socket,
        });
    }
    close() {
        if (this.socket && !this.socket.destroyed) {
            this.socket.destroy();
        }
        if (this.server) {
            this.server.close();
        }
        this.isListening = false;
        this.isConnected = false;
    }
}
//# sourceMappingURL=UnixPipeAdapter.js.map