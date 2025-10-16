import { Transform } from 'stream';
export class TeeTransform {
    kernel;
    inputPipe;
    outputPipes;
    transformer;
    isPaused = false;
    constructor(kernel, options = {}) {
        this.kernel = kernel;
        const outputCount = options.outputCount ?? 2;
        const objectMode = options.objectMode ?? true;
        if (outputCount < 1) {
            throw new Error('outputCount must be at least 1');
        }
        this.inputPipe = kernel.createPipe({ objectMode });
        this.outputPipes = [];
        for (let i = 0; i < outputCount; i++) {
            const outputPipe = kernel.createPipe({ objectMode });
            this.outputPipes.push(outputPipe);
            outputPipe.on('drain', () => {
                this.checkBackpressure();
            });
        }
        this.transformer = new Transform({
            objectMode,
            transform: (chunk, _enc, callback) => {
                this.handleData(chunk);
                callback();
            },
            flush: (callback) => {
                for (const outputPipe of this.outputPipes) {
                    outputPipe.end();
                }
                callback();
            }
        });
        this.inputPipe.pipe(this.transformer);
    }
    handleData(chunk) {
        let shouldPause = false;
        for (const outputPipe of this.outputPipes) {
            const canWrite = outputPipe.write(chunk);
            if (!canWrite) {
                shouldPause = true;
            }
        }
        if (shouldPause && !this.isPaused) {
            this.isPaused = true;
            this.transformer.pause();
        }
    }
    checkBackpressure() {
        if (!this.isPaused) {
            return;
        }
        const allReady = this.outputPipes.every((pipe) => {
            const writable = pipe.writableHighWaterMark - pipe.writableLength;
            return writable > 0;
        });
        if (allReady) {
            this.isPaused = false;
            this.transformer.resume();
        }
    }
}
//# sourceMappingURL=tee.js.map