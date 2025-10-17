import { Transform } from 'stream';
export class RateLimiterTransform {
    kernel;
    inputPipe;
    outputPipe;
    tokens;
    capacity;
    refillRate;
    refillInterval;
    refillTimer;
    pendingMessages = [];
    isProcessing = false;
    constructor(kernel, options = {}) {
        this.kernel = kernel;
        this.capacity = options.capacity ?? 10;
        this.refillRate = options.refillRate ?? 1;
        this.refillInterval = options.refillInterval ?? 100;
        this.tokens = this.capacity;
        this.inputPipe = kernel.createPipe({ objectMode: true });
        const transformer = new Transform({
            objectMode: true,
            transform: (chunk, _enc, cb) => {
                if (this.tokens >= 1) {
                    this.tokens--;
                    cb(null, chunk);
                }
                else {
                    this.pendingMessages.push({ chunk, callback: () => cb(null, chunk) });
                }
            },
        });
        this.outputPipe = kernel.createPipe({ objectMode: true });
        this.inputPipe.pipe(transformer).pipe(this.outputPipe);
        this.startRefillTimer();
    }
    startRefillTimer() {
        this.refillTimer = setInterval(() => {
            this.refillTokens();
            this.processPendingMessages();
        }, this.refillInterval);
    }
    refillTokens() {
        this.tokens = Math.min(this.capacity, this.tokens + this.refillRate);
    }
    processPendingMessages() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        while (this.pendingMessages.length > 0 && this.tokens >= 1) {
            const message = this.pendingMessages.shift();
            if (message) {
                this.tokens--;
                message.callback();
            }
        }
        this.isProcessing = false;
    }
    getTokens() {
        return this.tokens;
    }
    getPendingCount() {
        return this.pendingMessages.length;
    }
    stop() {
        if (this.refillTimer) {
            clearInterval(this.refillTimer);
            this.refillTimer = undefined;
        }
    }
}
//# sourceMappingURL=rateLimiter.js.map