import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
import { Transform } from 'stream';

export interface RateLimiterOptions {
  capacity?: number;
  refillRate?: number;
  refillInterval?: number;
}

export class RateLimiterTransform {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;

  private tokens: number;
  private capacity: number;
  private refillRate: number;
  private refillInterval: number;
  private refillTimer?: NodeJS.Timeout;
  private pendingMessages: Array<{ chunk: any; callback: () => void }> = [];
  private isProcessing = false;

  constructor(
    private kernel: Kernel,
    options: RateLimiterOptions = {}
  ) {
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
        } else {
          this.pendingMessages.push({ chunk, callback: () => cb(null, chunk) });
        }
      }
    });

    this.outputPipe = kernel.createPipe({ objectMode: true });
    this.inputPipe.pipe(transformer).pipe(this.outputPipe);

    this.startRefillTimer();
  }

  private startRefillTimer(): void {
    this.refillTimer = setInterval(() => {
      this.refillTokens();
      this.processPendingMessages();
    }, this.refillInterval);
  }

  private refillTokens(): void {
    this.tokens = Math.min(this.capacity, this.tokens + this.refillRate);
  }

  private processPendingMessages(): void {
    if (this.isProcessing) return;
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

  public getTokens(): number {
    return this.tokens;
  }

  public getPendingCount(): number {
    return this.pendingMessages.length;
  }

  public stop(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = undefined;
    }
  }
}
