import { BusAdapter } from './BusAdapter.js';
export type ControlMessage = Record<string, any>;
export declare class ControlBus {
    private adapter;
    constructor(adapter?: BusAdapter);
    publish(topic: string, msg: ControlMessage): void;
    subscribe(topic: string, handler: (msg: ControlMessage) => void): () => void;
}
//# sourceMappingURL=ControlBus.d.ts.map