import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';

export class TimerSource {
  public readonly outputPipe: Pipe;
  private interval?: NodeJS.Timeout;

  constructor(private kernel: Kernel, private periodMs = 500) {
    this.outputPipe = kernel.createPipe({ objectMode: true });
  }

  start() {
    if (this.interval) return;
    let count = 0;
    this.interval = setInterval(() => {
      this.outputPipe.write({ t: Date.now(), n: ++count });
    }, this.periodMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
  }
}
