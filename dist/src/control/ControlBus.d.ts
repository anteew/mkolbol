import { BusAdapter } from './BusAdapter.js';
import { TestEventEnvelope } from '../logging/TestEvent.js';
export type ControlMessage = Record<string, any>;
export type ControlBusEventLogger = (evt: TestEventEnvelope) => void;
export declare class ControlBus {
    private adapter;
    private eventLogger?;
    constructor(adapter?: BusAdapter);
    setEventLogger(logger: ControlBusEventLogger | undefined): void;
    publish(topic: string, msg: ControlMessage): void;
    subscribe(topic: string, handler: (msg: ControlMessage) => void): () => void;
}
//# sourceMappingURL=ControlBus.d.ts.map