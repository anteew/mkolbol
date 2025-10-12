import { BusAdapter } from './BusAdapter.js';
import { InProcBusAdapter } from './adapters/InProcBusAdapter.js';

export type ControlMessage = Record<string, any>;

export class ControlBus {
  private adapter: BusAdapter;

  constructor(adapter?: BusAdapter) {
    this.adapter = adapter ?? new InProcBusAdapter();
  }

  publish(topic: string, msg: ControlMessage): void {
    this.adapter.topic(topic).write(msg);
  }

  subscribe(topic: string, handler: (msg: ControlMessage) => void): () => void {
    const t = this.adapter.topic(topic);
    const onData = (m: any) => handler(m as ControlMessage);
    t.on('data', onData);
    return () => t.off('data', onData);
  }
}

