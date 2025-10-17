import { Transform } from 'stream';
export class UppercaseTransform {
    kernel;
    inputPipe;
    outputPipe;
    constructor(kernel) {
        this.kernel = kernel;
        this.inputPipe = kernel.createPipe({ objectMode: true });
        const transformer = new Transform({
            objectMode: true,
            transform(chunk, _enc, cb) {
                const s = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
                cb(null, s.toUpperCase());
            },
        });
        this.outputPipe = kernel.createPipe({ objectMode: true });
        this.inputPipe.pipe(transformer).pipe(this.outputPipe);
    }
}
//# sourceMappingURL=uppercase.js.map