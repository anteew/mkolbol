import { PassThrough } from 'node:stream';
import { BusAdapter } from '../BusAdapter.js';
export declare class InProcBusAdapter implements BusAdapter {
    private topics;
    topic(name: string): PassThrough;
}
//# sourceMappingURL=InProcBusAdapter.d.ts.map