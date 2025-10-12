import { InProcBusAdapter } from './adapters/InProcBusAdapter.js';
export class ControlBus {
    adapter;
    constructor(adapter) {
        this.adapter = adapter ?? new InProcBusAdapter();
    }
    publish(topic, msg) {
        this.adapter.topic(topic).write(msg);
    }
    subscribe(topic, handler) {
        const t = this.adapter.topic(topic);
        const onData = (m) => handler(m);
        t.on('data', onData);
        return () => t.off('data', onData);
    }
}
//# sourceMappingURL=ControlBus.js.map