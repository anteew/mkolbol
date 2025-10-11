import { Writable } from 'stream';
export class ConsoleSink {
    prefix;
    inputPipe;
    constructor(prefix = '[sink]') {
        this.prefix = prefix;
        const sink = new Writable({
            objectMode: true,
            write(chunk, _enc, cb) {
                if (typeof chunk === 'string') {
                    console.log(`${prefix} ${chunk}`);
                }
                else {
                    console.log(`${prefix} ${JSON.stringify(chunk)}`);
                }
                cb();
            }
        });
        this.inputPipe = sink;
    }
}
//# sourceMappingURL=consoleSink.js.map