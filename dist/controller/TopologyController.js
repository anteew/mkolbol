export class TopologyController {
    kernel;
    state;
    bus;
    unsub;
    commandsTopic;
    eventsTopic;
    constructor(kernel, state, bus, opts = {}) {
        this.kernel = kernel;
        this.state = state;
        this.bus = bus;
        this.commandsTopic = opts.commandsTopic ?? 'topology.commands';
        this.eventsTopic = opts.eventsTopic ?? 'topology.events';
    }
    start() {
        if (this.unsub)
            return;
        this.unsub = this.bus.subscribe(this.commandsTopic, (msg) => this.handleCommand(msg));
        this.state.subscribe((e) => {
            const frame = { kind: 'event', type: e.type, ts: Date.now(), payload: e };
            this.bus.publish(this.eventsTopic, frame);
        });
    }
    stop() {
        if (this.unsub)
            this.unsub();
        this.unsub = undefined;
    }
    ack(correlationId, payload) {
        const frame = { kind: 'ack', type: 'ok', ts: Date.now(), correlationId, payload };
        this.bus.publish(this.eventsTopic, frame);
    }
    err(correlationId, message) {
        const frame = { kind: 'err', type: 'error', ts: Date.now(), correlationId, payload: { message } };
        this.bus.publish(this.eventsTopic, frame);
    }
    handleCommand(frame) {
        try {
            const { type, payload, id } = frame;
            switch (type) {
                case 'declare-node': {
                    this.state.addNode(payload);
                    this.ack(id);
                    break;
                }
                case 'connect': {
                    this.state.connect(payload.from, payload.to);
                    this.ack(id);
                    break;
                }
                case 'split': {
                    this.state.split(payload.source, payload.destinations);
                    this.ack(id);
                    break;
                }
                case 'merge': {
                    this.state.merge(payload.sources, payload.destination);
                    this.ack(id);
                    break;
                }
                case 'snapshot': {
                    const topo = this.state.getTopology();
                    this.bus.publish(this.eventsTopic, { kind: 'event', type: 'topology.snapshot', ts: Date.now(), correlationId: id, payload: topo });
                    break;
                }
                default: {
                    this.err(id, `Unknown command type: ${type}`);
                }
            }
        }
        catch (e) {
            this.err(frame.id, e?.message ?? String(e));
        }
    }
}
//# sourceMappingURL=TopologyController.js.map