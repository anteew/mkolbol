import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
import { Transform } from 'stream';

export interface PipeMeterMetrics {
  totalBytes: number;
  totalMessages: number;
  bytesPerSecond: number;
  messagesPerSecond: number;
  startTime: number;
  lastUpdateTime: number;
}

export interface PipeMeterOptions {
  emitInterval?: number;
}

export class PipeMeterTransform {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;

  private totalBytes = 0;
  private totalMessages = 0;
  private bytesPerSecond = 0;
  private messagesPerSecond = 0;
  private startTime: number;
  private lastEmitTime: number;
  private lastEmitBytes = 0;
  private lastEmitMessages = 0;
  private emitInterval: number;
  private intervalTimer?: NodeJS.Timeout;

  constructor(
    private kernel: Kernel,
    options: PipeMeterOptions = {}
  ) {
    this.emitInterval = options.emitInterval ?? 1000;
    this.startTime = Date.now();
    this.lastEmitTime = this.startTime;

    this.inputPipe = kernel.createPipe({ objectMode: true });
    
    const transformer = new Transform({
      objectMode: true,
      transform: (chunk, _enc, cb) => {
        this.totalMessages++;
        
        const size = this.calculateSize(chunk);
        this.totalBytes += size;
        
        cb(null, chunk);
      }
    });

    this.outputPipe = kernel.createPipe({ objectMode: true });
    this.inputPipe.pipe(transformer).pipe(this.outputPipe);

    this.startMetricsEmitter();
  }

  private calculateSize(chunk: any): number {
    if (typeof chunk === 'string') {
      return Buffer.byteLength(chunk, 'utf8');
    } else if (Buffer.isBuffer(chunk)) {
      return chunk.length;
    } else if (typeof chunk === 'object') {
      return Buffer.byteLength(JSON.stringify(chunk), 'utf8');
    }
    return 0;
  }

  private startMetricsEmitter(): void {
    this.intervalTimer = setInterval(() => {
      this.updateRates();
    }, this.emitInterval);
  }

  private updateRates(): void {
    const now = Date.now();
    const timeDelta = (now - this.lastEmitTime) / 1000;
    
    if (timeDelta > 0) {
      const bytesDelta = this.totalBytes - this.lastEmitBytes;
      const messagesDelta = this.totalMessages - this.lastEmitMessages;
      
      this.bytesPerSecond = bytesDelta / timeDelta;
      this.messagesPerSecond = messagesDelta / timeDelta;
      
      this.lastEmitTime = now;
      this.lastEmitBytes = this.totalBytes;
      this.lastEmitMessages = this.totalMessages;
    }
  }

  public getMetrics(): PipeMeterMetrics {
    this.updateRates();
    
    return {
      totalBytes: this.totalBytes,
      totalMessages: this.totalMessages,
      bytesPerSecond: this.bytesPerSecond,
      messagesPerSecond: this.messagesPerSecond,
      startTime: this.startTime,
      lastUpdateTime: Date.now(),
    };
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
  }
}
