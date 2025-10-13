export class TimerSource {
    kernel;
    periodMs;
    outputPipe;
    interval;
    constructor(kernel, periodMs = 500) {
        this.kernel = kernel;
        this.periodMs = periodMs;
        this.outputPipe = kernel.createPipe({ objectMode: true });
    }
    start() {
        if (this.interval)
            return;
        let count = 0;
        this.interval = setInterval(() => {
            this.outputPipe.write({ t: Date.now(), n: ++count });
        }, this.periodMs);
    }
    stop() {
        if (this.interval)
            clearInterval(this.interval);
        this.interval = undefined;
    }
}
//# sourceMappingURL=timer.js.map