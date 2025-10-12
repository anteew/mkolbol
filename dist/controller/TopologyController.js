export class TopologyController {
    kernel;
    state;
    bus;
    unsub;
    commandsTopic;
    eventsTopic;
    loggerHook;
    constructor(kernel, state, bus, opts = {}) {
        this.kernel = kernel;
        this.state = state;
        this.bus = bus;
        this.commandsTopic = opts.commandsTopic ?? 'topology.commands';
        this.eventsTopic = opts.eventsTopic ?? 'topology.events';
        this.loggerHook = opts.loggerHook;
        if (!this.loggerHook && process.env.LAMINAR_DEBUG === '1') {
            // Default to forwarding events through ControlBus event logger if set
            this.loggerHook = (evt) => {
                // @ts-ignore access private for debug
                this.bus.eventLogger?.(evt);
            };
        }
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
            this.loggerHook?.({
                ts: Date.now(),
                lvl: 'debug',
                case: 'topology-controller',
                evt: 'cmd-received',
                id,
                corr: frame.correlationId,
                payload: { type, payload }
            });
            switch (type) {
                case 'declare-node': {
                    this.state.addNode(payload);
                    this.ack(id);
                    this.loggerHook?.({
                        ts: Date.now(),
                        lvl: 'debug',
                        case: 'topology-controller',
                        evt: 'cmd-applied',
                        id,
                        payload: { type, node: payload }
                    });
                    break;
                }
                case 'connect': {
                    this.state.connect(payload.from, payload.to);
                    this.ack(id);
                    this.loggerHook?.({
                        ts: Date.now(),
                        lvl: 'debug',
                        case: 'topology-controller',
                        evt: 'cmd-applied',
                        id,
                        payload: { type, from: payload.from, to: payload.to }
                    });
                    break;
                }
                case 'split': {
                    this.state.split(payload.source, payload.destinations);
                    this.ack(id);
                    this.loggerHook?.({
                        ts: Date.now(),
                        lvl: 'debug',
                        case: 'topology-controller',
                        evt: 'cmd-applied',
                        id,
                        payload: { type, source: payload.source, destinations: payload.destinations }
                    });
                    break;
                }
                case 'merge': {
                    this.state.merge(payload.sources, payload.destination);
                    this.ack(id);
                    this.loggerHook?.({
                        ts: Date.now(),
                        lvl: 'debug',
                        case: 'topology-controller',
                        evt: 'cmd-applied',
                        id,
                        payload: { type, sources: payload.sources, destination: payload.destination }
                    });
                    break;
                }
                case 'snapshot': {
                    const topo = this.state.getTopology();
                    this.bus.publish(this.eventsTopic, { kind: 'event', type: 'topology.snapshot', ts: Date.now(), correlationId: id, payload: topo });
                    this.loggerHook?.({
                        ts: Date.now(),
                        lvl: 'debug',
                        case: 'topology-controller',
                        evt: 'snapshot',
                        id,
                        payload: topo
                    });
                    break;
                }
                default: {
                    this.err(id, `Unknown command type: ${type}`);
                    this.loggerHook?.({
                        ts: Date.now(),
                        lvl: 'error',
                        case: 'topology-controller',
                        evt: 'error',
                        id,
                        payload: { message: `Unknown command type: ${type}` }
                    });
                }
            }
        }
        catch (e) {
            this.err(frame.id, e?.message ?? String(e));
            this.loggerHook?.({
                ts: Date.now(),
                lvl: 'error',
                case: 'topology-controller',
                evt: 'error',
                id: frame.id,
                payload: { message: e?.message ?? String(e) }
            });
        }
    }
}
//# sourceMappingURL=TopologyController.js.map