// Local copy of ProcessControlAdapter to avoid TS resolution edge in CI
interface ProcessControlAdapter {
  publish(topic: string, data: unknown): void;
  subscribe(topic: string, handler: (data: unknown) => void): () => void;
}
import { parentPort } from 'node:worker_threads';

export class WorkerControlAdapter implements ProcessControlAdapter {
  private handlers = new Map<string, Set<(data: unknown) => void>>();

  constructor() {
    if (parentPort) {
      parentPort.on('message', (msg) => {
        if (msg?.type === 'control' && msg?.topic) {
          this.handleIncoming(msg.topic, msg.data);
        }
      });
    }
  }

  publish(topic: string, data: unknown): void {
    if (parentPort) {
      parentPort.postMessage({ type: 'control', topic, data });
    }
  }

  subscribe(topic: string, handler: (data: unknown) => void): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);
    return () => {
      this.handlers.get(topic)?.delete(handler);
    };
  }

  private handleIncoming(topic: string, data: unknown): void {
    const handlers = this.handlers.get(topic);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}
