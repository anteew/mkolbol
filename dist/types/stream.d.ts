import { Duplex } from 'stream';
export type Pipe = Duplex;
export interface StreamOptions {
    highWaterMark?: number;
    objectMode?: boolean;
}
export interface Capabilities {
    accepts?: string[];
    produces?: string[];
    type: 'input' | 'source' | 'transform' | 'output';
    features?: string[];
}
export interface CapabilityQuery {
    accepts?: string;
    produces?: string;
    features?: string[];
}
//# sourceMappingURL=stream.d.ts.map