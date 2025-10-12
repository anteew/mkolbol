import { PassThrough } from 'node:stream';
import { BusAdapter } from '../BusAdapter.js';

export class InProcBusAdapter implements BusAdapter {
  private topics = new Map<string, PassThrough>();

  topic(name: string): PassThrough {
    let t = this.topics.get(name);
    if (!t) {
      t = new PassThrough({ objectMode: true });
      this.topics.set(name, t);
    }
    return t;
  }
}
