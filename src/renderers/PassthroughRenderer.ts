import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';

export class PassthroughRenderer {
  public readonly inputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();

    this.inputPipe.on('data', (data: Buffer) => {
      process.stdout.write(data);
    });

    this.inputPipe.on('error', (err) => {
      console.error('PassthroughRenderer error:', err);
    });
  }

  destroy(): void {
    this.inputPipe.removeAllListeners();
    this.inputPipe.destroy();
  }
}
