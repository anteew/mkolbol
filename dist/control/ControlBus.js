import { InProcBusAdapter } from './adapters/InProcBusAdapter.js';
export class ControlBus {
    adapter;
    eventLogger;
    constructor(adapter) {
        this.adapter = adapter ?? new InProcBusAdapter();
    }
    setEventLogger(logger) {
        this.eventLogger = logger;
    }
    publish(topic, msg) {
        this.adapter.topic(topic).write(msg);
        if (this.eventLogger) {
            const payloadSize = JSON.stringify(msg).length;
            this.eventLogger({
                ts: Date.now(),
                lvl: 'debug',
                case: 'control-bus',
                evt: 'publish',
                payload: { topic, payloadSize },
            });
        }
    }
    subscribe(topic, handler) {
        const t = this.adapter.topic(topic);
        const onData = (m) => {
            if (this.eventLogger) {
                const payloadSize = JSON.stringify(m).length;
                this.eventLogger({
                    ts: Date.now(),
                    lvl: 'debug',
                    case: 'control-bus',
                    evt: 'subscribe',
                    payload: { topic, payloadSize },
                });
            }
            handler(m);
        };
        t.on('data', onData);
        return () => t.off('data', onData);
    }
}
//# sourceMappingURL=ControlBus.js.map