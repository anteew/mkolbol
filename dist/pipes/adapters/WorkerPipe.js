import { Duplex } from 'stream';
class WorkerPipeDuplex extends Duplex {
    port;
    paused = false;
    buffer = [];
    constructor(options) {
        const { port, ...streamOptions } = options;
        super(streamOptions);
        this.port = port;
        this.port.on('message', (data) => {
            if (data && data.type === 'pause') {
                this.paused = true;
                return;
            }
            if (data && data.type === 'resume') {
                this.paused = false;
                this.drainBuffer();
                return;
            }
            if (data && data.type === 'end') {
                this.push(null);
                return;
            }
            if (data && data.type === 'data') {
                const payload = data.payload;
                if (!this.push(payload)) {
                    this.port.postMessage({ type: 'pause' });
                }
            }
            else {
                if (!this.push(data)) {
                    this.port.postMessage({ type: 'pause' });
                }
            }
        });
        this.port.on('messageerror', () => {
            this.destroy(new Error('MessagePort error'));
        });
        this.on('finish', () => {
            this.port.postMessage({ type: 'end' });
        });
    }
    _read(size) {
        this.port.postMessage({ type: 'resume' });
    }
    _write(chunk, encoding, callback) {
        if (this.paused) {
            this.buffer.push(chunk);
            callback();
        }
        else {
            try {
                this.port.postMessage({ type: 'data', payload: chunk });
                callback();
            }
            catch (error) {
                callback(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }
    _final(callback) {
        this.port.postMessage({ type: 'end' });
        callback();
    }
    _destroy(error, callback) {
        this.port.close();
        callback(error);
    }
    drainBuffer() {
        while (this.buffer.length > 0 && !this.paused) {
            const chunk = this.buffer.shift();
            this.port.postMessage({ type: 'data', payload: chunk });
        }
    }
}
export class WorkerPipe {
    port;
    constructor(port) {
        this.port = port;
    }
    createDuplex(options) {
        return new WorkerPipeDuplex({
            ...options,
            port: this.port,
        });
    }
}
//# sourceMappingURL=WorkerPipe.js.map