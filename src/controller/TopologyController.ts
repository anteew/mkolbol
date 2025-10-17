import { Kernel } from '../kernel/Kernel.js';
import { StateManager } from '../state/StateManager.js';
import { ControlBus } from '../control/ControlBus.js';
import { TestEventEnvelope } from '../logging/TestEvent.js';

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
  loggerHook?: (evt: TestEventEnvelope) => void;
}

export class TopologyController {
  private unsub?: () => void;
  private readonly commandsTopic: string;
  private readonly eventsTopic: string;
  private readonly loggerHook?: (evt: TestEventEnvelope) => void;

  constructor(
    private kernel: Kernel,
    private state: StateManager,
    private bus: ControlBus,
    opts: TopologyControllerOptions = {},
  ) {
    this.commandsTopic = opts.commandsTopic ?? 'topology.commands';
    this.eventsTopic = opts.eventsTopic ?? 'topology.events';
    this.loggerHook = opts.loggerHook;
    if (!this.loggerHook && process.env.LAMINAR_DEBUG === '1') {
      // Default to forwarding events through ControlBus event logger if set
      this.loggerHook = (evt: TestEventEnvelope) => {
        // @ts-ignore access private for debug
        (this.bus as any).eventLogger?.(evt);
      };
    }
  }

  start(): void {
    if (this.unsub) return;
    this.unsub = this.bus.subscribe(this.commandsTopic, (msg) =>
      this.handleCommand(msg as FrameBase),
    );
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
    const frame: FrameBase = {
      kind: 'err',
      type: 'error',
      ts: Date.now(),
      correlationId,
      payload: { message },
    };
    this.bus.publish(this.eventsTopic, frame);
  }

  private handleCommand(frame: FrameBase) {
    try {
      const { type, payload, id } = frame;
      this.loggerHook?.({
        ts: Date.now(),
        lvl: 'debug',
        case: 'topology-controller',
        evt: 'cmd-received',
        id,
        corr: frame.correlationId,
        payload: { type, payload },
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
            payload: { type, node: payload },
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
            payload: { type, from: payload.from, to: payload.to },
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
            payload: { type, source: payload.source, destinations: payload.destinations },
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
            payload: { type, sources: payload.sources, destination: payload.destination },
          });
          break;
        }
        case 'snapshot': {
          const topo = this.state.getTopology();
          this.bus.publish(this.eventsTopic, {
            kind: 'event',
            type: 'topology.snapshot',
            ts: Date.now(),
            correlationId: id,
            payload: topo,
          });
          this.loggerHook?.({
            ts: Date.now(),
            lvl: 'debug',
            case: 'topology-controller',
            evt: 'snapshot',
            id,
            payload: topo,
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
            payload: { message: `Unknown command type: ${type}` },
          });
        }
      }
    } catch (e: any) {
      this.err(frame.id, e?.message ?? String(e));
      this.loggerHook?.({
        ts: Date.now(),
        lvl: 'error',
        case: 'topology-controller',
        evt: 'error',
        id: frame.id,
        payload: { message: e?.message ?? String(e) },
      });
    }
  }
}
