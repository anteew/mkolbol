import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
import { Transform } from 'stream';
import { AnsiParser } from '../transforms/AnsiParser.js';
import type { AnsiParserEvent } from '../transforms/AnsiParser.js';

export class AnsiParserModule {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;
  private parser: AnsiParser;

  constructor(private kernel: Kernel, name = 'ansi-parser') {
    this.parser = new AnsiParser();
    this.inputPipe = kernel.createPipe({ objectMode: true });
    
    const transformer = new Transform({
      objectMode: true,
      transform: (chunk, _enc, cb) => {
        const input = typeof chunk === 'string' ? chunk : chunk.toString();
        const events: AnsiParserEvent[] = this.parser.parse(input);
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

  reset(): void {
    this.parser.reset();
  }

  getState() {
    return this.parser.getState();
  }
}
