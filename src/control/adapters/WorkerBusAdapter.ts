import { PassThrough } from 'node:stream';
import { MessagePort } from 'node:worker_threads';
import { BusAdapter } from '../BusAdapter.js';

interface PortMessage {
  type: 'publish' | 'subscribe' | 'unsubscribe';
  topic: string;
  data?: any;
}

export class WorkerBusAdapter implements BusAdapter {
  private port: MessagePort;
  private topics = new Map<string, PassThrough>();
  private subscriptions = new Set<string>();

  constructor(port: MessagePort) {
    this.port = port;
    this.port.on('message', this.handleMessage.bind(this));
  }

  topic(name: string): PassThrough {
    let t = this.topics.get(name);
    if (!t) {
      t = new PassThrough({ objectMode: true });
      this.topics.set(name, t);

      t.on('data', (data: any) => {
        this.port.postMessage({
          type: 'publish',
          topic: name,
          data,
        } as PortMessage);
      });

      if (!this.subscriptions.has(name)) {
        this.subscriptions.add(name);
        this.port.postMessage({
          type: 'subscribe',
          topic: name,
        } as PortMessage);
      }
    }
    return t;
  }

  private handleMessage(msg: PortMessage): void {
    if (msg.type === 'publish') {
      const stream = this.topics.get(msg.topic);
      if (stream && msg.data !== undefined) {
        stream.write(msg.data);
      }
    }
  }

  unsubscribe(topic: string): void {
    if (this.subscriptions.has(topic)) {
      this.subscriptions.delete(topic);
      this.port.postMessage({
        type: 'unsubscribe',
        topic,
      } as PortMessage);
    }

    const stream = this.topics.get(topic);
    if (stream) {
      stream.end();
      this.topics.delete(topic);
    }
  }

  close(): void {
    for (const topic of this.subscriptions) {
      this.unsubscribe(topic);
    }
    this.port.close();
  }
}
