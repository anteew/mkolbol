import { InProcBusAdapter } from './adapters/InProcBusAdapter.js';
import { createLogger } from '../logging/logger.js';
export class ControlBus {
    adapter;
    eventLogger;
    constructor(adapter) {
        this.adapter = adapter ?? new InProcBusAdapter();
        if (process.env.LAMINAR_DEBUG === '1') {
            const suite = process.env.LAMINAR_SUITE || 'debug';
            const caseName = (process.env.LAMINAR_CASE || 'control-bus').replace(/[^a-zA-Z0-9-_]/g, '_');
            const logger = createLogger(suite, caseName);
            this.eventLogger = (evt) => logger.emit(evt.evt, {
                payload: evt.payload,
                id: evt.id,
                corr: evt.corr,
                phase: evt.phase,
                lvl: evt.lvl,
            });
        }
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