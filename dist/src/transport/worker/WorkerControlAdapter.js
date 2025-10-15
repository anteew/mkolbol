import { parentPort } from 'node:worker_threads';
export class WorkerControlAdapter {
    handlers = new Map();
    constructor() {
        if (parentPort) {
            parentPort.on('message', (msg) => {
                if (msg?.type === 'control' && msg?.topic) {
                    this.handleIncoming(msg.topic, msg.data);
                }
            });
        }
    }
    publish(topic, data) {
        if (parentPort) {
            parentPort.postMessage({ type: 'control', topic, data });
        }
    }
    subscribe(topic, handler) {
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, new Set());
        }
        this.handlers.get(topic).add(handler);
        return () => {
            this.handlers.get(topic)?.delete(handler);
        };
    }
    handleIncoming(topic, data) {
        const handlers = this.handlers.get(topic);
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }
}
//# sourceMappingURL=WorkerControlAdapter.js.map