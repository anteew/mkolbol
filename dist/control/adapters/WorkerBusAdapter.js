import { PassThrough } from 'node:stream';
export class WorkerBusAdapter {
    port;
    topics = new Map();
    subscriptions = new Set();
    constructor(port) {
        this.port = port;
        this.port.on('message', this.handleMessage.bind(this));
    }
    topic(name) {
        let t = this.topics.get(name);
        if (!t) {
            t = new PassThrough({ objectMode: true });
            this.topics.set(name, t);
            t.on('data', (data) => {
                this.port.postMessage({
                    type: 'publish',
                    topic: name,
                    data
                });
            });
            if (!this.subscriptions.has(name)) {
                this.subscriptions.add(name);
                this.port.postMessage({
                    type: 'subscribe',
                    topic: name
                });
            }
        }
        return t;
    }
    handleMessage(msg) {
        if (msg.type === 'publish') {
            const stream = this.topics.get(msg.topic);
            if (stream && msg.data !== undefined) {
                stream.write(msg.data);
            }
        }
    }
    unsubscribe(topic) {
        if (this.subscriptions.has(topic)) {
            this.subscriptions.delete(topic);
            this.port.postMessage({
                type: 'unsubscribe',
                topic
            });
        }
        const stream = this.topics.get(topic);
        if (stream) {
            stream.end();
            this.topics.delete(topic);
        }
    }
    close() {
        for (const topic of this.subscriptions) {
            this.unsubscribe(topic);
        }
        this.port.close();
    }
}
//# sourceMappingURL=WorkerBusAdapter.js.map