import { Transform } from 'stream';
export class PipeMeterTransform {
    kernel;
    inputPipe;
    outputPipe;
    totalBytes = 0;
    totalMessages = 0;
    bytesPerSecond = 0;
    messagesPerSecond = 0;
    startTime;
    lastEmitTime;
    lastEmitBytes = 0;
    lastEmitMessages = 0;
    emitInterval;
    intervalTimer;
    constructor(kernel, options = {}) {
        this.kernel = kernel;
        this.emitInterval = options.emitInterval ?? 1000;
        this.startTime = Date.now();
        this.lastEmitTime = this.startTime;
        this.inputPipe = kernel.createPipe({ objectMode: true });
        const transformer = new Transform({
            objectMode: true,
            transform: (chunk, _enc, cb) => {
                this.totalMessages++;
                const size = this.calculateSize(chunk);
                this.totalBytes += size;
                cb(null, chunk);
            },
        });
        this.outputPipe = kernel.createPipe({ objectMode: true });
        this.inputPipe.pipe(transformer).pipe(this.outputPipe);
        this.startMetricsEmitter();
    }
    calculateSize(chunk) {
        if (typeof chunk === 'string') {
            return Buffer.byteLength(chunk, 'utf8');
        }
        else if (Buffer.isBuffer(chunk)) {
            return chunk.length;
        }
        else if (typeof chunk === 'object') {
            return Buffer.byteLength(JSON.stringify(chunk), 'utf8');
        }
        return 0;
    }
    startMetricsEmitter() {
        this.intervalTimer = setInterval(() => {
            this.updateRates();
        }, this.emitInterval);
    }
    updateRates() {
        const now = Date.now();
        const timeDelta = (now - this.lastEmitTime) / 1000;
        if (timeDelta > 0) {
            const bytesDelta = this.totalBytes - this.lastEmitBytes;
            const messagesDelta = this.totalMessages - this.lastEmitMessages;
            this.bytesPerSecond = bytesDelta / timeDelta;
            this.messagesPerSecond = messagesDelta / timeDelta;
            this.lastEmitTime = now;
            this.lastEmitBytes = this.totalBytes;
            this.lastEmitMessages = this.totalMessages;
        }
    }
    getMetrics() {
        this.updateRates();
        return {
            totalBytes: this.totalBytes,
            totalMessages: this.totalMessages,
            bytesPerSecond: this.bytesPerSecond,
            messagesPerSecond: this.messagesPerSecond,
            startTime: this.startTime,
            lastUpdateTime: Date.now(),
        };
    }
    stop() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = undefined;
        }
    }
}
//# sourceMappingURL=pipeMeter.js.map