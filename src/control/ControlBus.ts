import { BusAdapter } from './BusAdapter.js';
import { InProcBusAdapter } from './adapters/InProcBusAdapter.js';
import { TestEventEnvelope } from '../logging/TestEvent.js';
import { createLogger } from '../logging/logger.js';

export type ControlMessage = Record<string, any>;

export type ControlBusEventLogger = (evt: TestEventEnvelope) => void;

export class ControlBus {
  private adapter: BusAdapter;
  private eventLogger?: ControlBusEventLogger;

  constructor(adapter?: BusAdapter) {
    this.adapter = adapter ?? new InProcBusAdapter();
    if (process.env.LAMINAR_DEBUG === '1') {
      const suite = process.env.LAMINAR_SUITE || 'debug';
      const caseName = (process.env.LAMINAR_CASE || 'control-bus').replace(/[^a-zA-Z0-9-_]/g, '_');
      const logger = createLogger(suite, caseName);
      this.eventLogger = (evt) =>
        logger.emit(evt.evt, {
          payload: evt.payload,
          id: evt.id,
          corr: evt.corr,
          phase: evt.phase,
          lvl: evt.lvl,
        });
    }
  }

  setEventLogger(logger: ControlBusEventLogger | undefined): void {
    this.eventLogger = logger;
  }

  publish(topic: string, msg: ControlMessage): void {
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

  subscribe(topic: string, handler: (msg: ControlMessage) => void): () => void {
    const t = this.adapter.topic(topic);
    const onData = (m: any) => {
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
      handler(m as ControlMessage);
    };
    t.on('data', onData);
    return () => t.off('data', onData);
  }
}
