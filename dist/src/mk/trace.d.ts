import { EventEmitter } from 'node:events';
import type { TopologyConfig } from '../config/schema.js';
export interface FlowTiming {
    connectionId: string;
    timestamp: number;
    latencyMs: number;
    throughput: number;
}
export interface BottleneckInfo {
    connectionId: string;
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughput: number;
    severity: 'low' | 'medium' | 'high';
}
export interface TraceData {
    duration: number;
    startTime: number;
    endTime: number;
    timings: FlowTiming[];
    connections: string[];
    bottlenecks: BottleneckInfo[];
    statistics: {
        totalMessages: number;
        avgLatency: number;
        p50Latency: number;
        p95Latency: number;
        p99Latency: number;
        throughput: number;
    };
}
export interface TraceOptions {
    duration?: number;
    sampleInterval?: number;
    verbose?: boolean;
}
export declare class TraceCollector extends EventEmitter {
    private timings;
    private messageCounters;
    private latencyBuffers;
    private startTime;
    private sampleInterval;
    private verbose;
    constructor(options?: TraceOptions);
    start(): void;
    recordFlow(connectionId: string, latencyMs: number): void;
    stop(): TraceData;
    private percentile;
    private identifyBottlenecks;
}
export declare function captureTrace(topology: TopologyConfig, duration?: number, options?: TraceOptions): Promise<TraceData>;
export declare function formatTraceOutput(data: TraceData, format?: 'text' | 'json'): string;
//# sourceMappingURL=trace.d.ts.map