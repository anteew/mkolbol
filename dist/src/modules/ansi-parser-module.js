import { Transform } from 'stream';
import { AnsiParser } from '../transforms/AnsiParser.js';
export class AnsiParserModule {
    kernel;
    inputPipe;
    outputPipe;
    parser;
    constructor(kernel, name = 'ansi-parser') {
        this.kernel = kernel;
        this.parser = new AnsiParser();
        this.inputPipe = kernel.createPipe({ objectMode: true });
        const transformer = new Transform({
            objectMode: true,
            transform: (chunk, _enc, cb) => {
                const input = typeof chunk === 'string' ? chunk : chunk.toString();
                const events = this.parser.parse(input);
                cb(null, events);
            }
        });
        this.outputPipe = kernel.createPipe({ objectMode: true });
        this.inputPipe.pipe(transformer).pipe(this.outputPipe);
        kernel.register(name, {
            type: 'transform',
            accepts: ['text', 'ansi', 'terminal'],
            produces: ['ansi-events', 'parsed-ansi'],
            features: ['ansi-parser', 'terminal-parser', 'escape-sequences']
        }, this.outputPipe);
    }
    reset() {
        this.parser.reset();
    }
    getState() {
        return this.parser.getState();
    }
}
//# sourceMappingURL=ansi-parser-module.js.map