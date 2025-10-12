import { Kernel } from '../kernel/Kernel.js';
import { StateManager } from '../state/StateManager.js';
import { ControlBus } from '../control/ControlBus.js';

type FrameKind = 'cmd' | 'event' | 'ack' | 'err';

interface FrameBase {
  kind: FrameKind;
  type: string;
  id?: string;
  ts?: number;
  correlationId?: string;
  src?: string;
  dst?: string;
  payload?: any;
}

export interface TopologyControllerOptions {
  commandsTopic?: string;
  eventsTopic?: string;
}

export class TopologyController {
  private unsub?: () => void;
  private readonly commandsTopic: string;
  private readonly eventsTopic: string;

  constructor(
    private kernel: Kernel,
    private state: StateManager,
    private bus: ControlBus,
    opts: TopologyControllerOptions = {}
  ) {
    this.commandsTopic = opts.commandsTopic ?? 'topology.commands';
    this.eventsTopic = opts.eventsTopic ?? 'topology.events';
  }

  start(): void {
    if (this.unsub) return;
    this.unsub = this.bus.subscribe(this.commandsTopic, (msg) => this.handleCommand(msg as FrameBase));
    this.state.subscribe((e) => {
      const frame: FrameBase = { kind: 'event', type: e.type, ts: Date.now(), payload: e };
      this.bus.publish(this.eventsTopic, frame);
    });
  }

  stop(): void {
    if (this.unsub) this.unsub();
    this.unsub = undefined;
  }

  private ack(correlationId?: string, payload?: any) {
    const frame: FrameBase = { kind: 'ack', type: 'ok', ts: Date.now(), correlationId, payload };
    this.bus.publish(this.eventsTopic, frame);
  }

  private err(correlationId: string | undefined, message: string) {
    const frame: FrameBase = { kind: 'err', type: 'error', ts: Date.now(), correlationId, payload: { message } };
    this.bus.publish(this.eventsTopic, frame);
  }

  private handleCommand(frame: FrameBase) {
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
    } catch (e: any) {
      this.err(frame.id, e?.message ?? String(e));
    }
  }
}

