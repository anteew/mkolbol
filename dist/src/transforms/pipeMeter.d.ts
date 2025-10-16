import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
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
export declare class PipeMeterTransform {
    private kernel;
    readonly inputPipe: Pipe;
    readonly outputPipe: Pipe;
    private totalBytes;
    private totalMessages;
    private bytesPerSecond;
    private messagesPerSecond;
    private startTime;
    private lastEmitTime;
    private lastEmitBytes;
    private lastEmitMessages;
    private emitInterval;
    private intervalTimer?;
    constructor(kernel: Kernel, options?: PipeMeterOptions);
    private calculateSize;
    private startMetricsEmitter;
    private updateRates;
    getMetrics(): PipeMeterMetrics;
    stop(): void;
}
//# sourceMappingURL=pipeMeter.d.ts.map