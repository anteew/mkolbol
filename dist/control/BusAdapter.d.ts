import { PassThrough } from 'node:stream';
export interface BusAdapter {
    topic(name: string): PassThrough;
}
//# sourceMappingURL=BusAdapter.d.ts.map