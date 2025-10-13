import { PassThrough } from 'node:stream';
export class InProcBusAdapter {
    topics = new Map();
    topic(name) {
        let t = this.topics.get(name);
        if (!t) {
            t = new PassThrough({ objectMode: true });
            this.topics.set(name, t);
        }
        return t;
    }
}
//# sourceMappingURL=InProcBusAdapter.js.map