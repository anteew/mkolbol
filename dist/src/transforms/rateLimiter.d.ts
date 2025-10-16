import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
export interface RateLimiterOptions {
    capacity?: number;
    refillRate?: number;
    refillInterval?: number;
}
export declare class RateLimiterTransform {
    private kernel;
    readonly inputPipe: Pipe;
    readonly outputPipe: Pipe;
    private tokens;
    private capacity;
    private refillRate;
    private refillInterval;
    private refillTimer?;
    private pendingMessages;
    private isProcessing;
    constructor(kernel: Kernel, options?: RateLimiterOptions);
    private startRefillTimer;
    private refillTokens;
    private processPendingMessages;
    getTokens(): number;
    getPendingCount(): number;
    stop(): void;
}
//# sourceMappingURL=rateLimiter.d.ts.map