import { BusAdapter } from './BusAdapter.js';
import { InProcBusAdapter } from './adapters/InProcBusAdapter.js';
import { TestEventEnvelope } from '../logging/TestEvent.js';

export type ControlMessage = Record<string, any>;

export type ControlBusEventLogger = (evt: TestEventEnvelope) => void;

export class ControlBus {
  private adapter: BusAdapter;
  private eventLogger?: ControlBusEventLogger;

  constructor(adapter?: BusAdapter) {
    this.adapter = adapter ?? new InProcBusAdapter();
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

