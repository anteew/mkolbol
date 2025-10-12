import { PassThrough } from 'node:stream';
import { MessagePort } from 'node:worker_threads';
import { BusAdapter } from '../BusAdapter.js';
export declare class WorkerBusAdapter implements BusAdapter {
    private port;
    private topics;
    private subscriptions;
    constructor(port: MessagePort);
    topic(name: string): PassThrough;
    private handleMessage;
    unsubscribe(topic: string): void;
    close(): void;
}
//# sourceMappingURL=WorkerBusAdapter.d.ts.map