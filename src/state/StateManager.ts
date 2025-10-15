import { Duplex } from 'node:stream';
import { Kernel } from '../kernel/Kernel.js';
import {
  NodeDef,
  TerminalRef,
  PipeOptions,
  PipeMetadata,
  ConnectionMetadata,
  TopologySnapshot,
  TopologyEvent,
  ValidationResult,
} from '../types/topology.js';
import { debug } from '../debug/api.js';

type ValidatorFn = (from: TerminalRef, tos: TerminalRef[], type: 'direct' | 'split' | 'merge') => ValidationResult;

export class StateManager {
  private nodes = new Map<string, NodeDef>();
  private pipes = new Map<string, { meta: PipeMetadata; pipe: Duplex }>();
  private connections = new Map<string, ConnectionMetadata>();
  private listeners = new Set<(e: TopologyEvent) => void>();
  private validator?: ValidatorFn;

  constructor(private kernel: Kernel) {}

  subscribe(fn: (e: TopologyEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: TopologyEvent) {
    debug.emit('state', `event.${e.type}`, e);
    for (const l of this.listeners) l(e);
  }

  addNode(manifest: Partial<NodeDef>): NodeDef {
    const id = manifest.id ?? this.genId(manifest.name ?? 'node');
    const node: NodeDef = {
      id,
      name: manifest.name ?? id,
      terminals: manifest.terminals ?? [],
      capabilities: manifest.capabilities ?? [],
      humanReadable: manifest.humanReadable ?? (manifest.name ?? id),
      location: manifest.location ?? 'local',
    } as NodeDef;
    this.nodes.set(id, node);
    this.emit({ type: 'node-added', node });
    return node;
  }

  createPipe(addrOrRef: string | TerminalRef, options?: PipeOptions): Duplex {
    const ref = typeof addrOrRef === 'string' ? this.parseAddress(addrOrRef) : addrOrRef;
    const address = `${ref.nodeId}.${ref.terminal}`;
    const existing = this.pipes.get(address);
    if (existing) return existing.pipe;
    const pipe = this.kernel.createPipe(options);
    const meta: PipeMetadata = { id: address, options, address, connected: false };
    this.pipes.set(address, { meta, pipe });
    this.emit({ type: 'pipe-created', pipe: meta });
    return pipe;
  }

  connect(from: string | TerminalRef, to: string | TerminalRef): ConnectionMetadata {
    const fromRef = typeof from === 'string' ? this.parseAddress(from) : from;
    const toRef = typeof to === 'string' ? this.parseAddress(to) : to;
    this.validate(fromRef, [toRef], 'direct');

    const fromPipe = this.createPipe(fromRef);
    const toPipe = this.createPipe(toRef);
    this.kernel.connect(fromPipe, toPipe);

    const id = `${fromRef.nodeId}.${fromRef.terminal}→${toRef.nodeId}.${toRef.terminal}`;
    const conn: ConnectionMetadata = {
      id,
      from: `${fromRef.nodeId}.${fromRef.terminal}`,
      to: [`${toRef.nodeId}.${toRef.terminal}`],
      type: 'direct',
      establishedAt: new Date(),
    };
    this.connections.set(id, conn);
    this.emit({ type: 'connected', connection: conn });
    return conn;
  }

  split(source: string | TerminalRef, destinations: (string | TerminalRef)[]): ConnectionMetadata[] {
    const srcRef = typeof source === 'string' ? this.parseAddress(source) : source;
    const dstRefs = destinations.map((d) => (typeof d === 'string' ? this.parseAddress(d) : d));
    this.validate(srcRef, dstRefs, 'split');
    const fromPipe = this.createPipe(srcRef);
    const toPipes = dstRefs.map((r) => this.createPipe(r));
    this.kernel.split(fromPipe, toPipes);

    const conns: ConnectionMetadata[] = dstRefs.map((r) => ({
      id: `${srcRef.nodeId}.${srcRef.terminal}→${r.nodeId}.${r.terminal}`,
      from: `${srcRef.nodeId}.${srcRef.terminal}`,
      to: [`${r.nodeId}.${r.terminal}`],
      type: 'split',
      establishedAt: new Date(),
    }));
    for (const c of conns) this.connections.set(c.id, c);
    this.emit({ type: 'split', connections: conns });
    return conns;
  }

  merge(sources: (string | TerminalRef)[], destination: string | TerminalRef): ConnectionMetadata[] {
    const srcRefs = sources.map((s) => (typeof s === 'string' ? this.parseAddress(s) : s));
    const dstRef = typeof destination === 'string' ? this.parseAddress(destination) : destination;
    this.validate(dstRef, srcRefs, 'merge');
    const fromPipes = srcRefs.map((r) => this.createPipe(r));
    const toPipe = this.createPipe(dstRef);
    this.kernel.merge(fromPipes, toPipe);

    const conns: ConnectionMetadata[] = srcRefs.map((r) => ({
      id: `${r.nodeId}.${r.terminal}→${dstRef.nodeId}.${dstRef.terminal}`,
      from: `${r.nodeId}.${r.terminal}`,
      to: [`${dstRef.nodeId}.${dstRef.terminal}`],
      type: 'merge',
      establishedAt: new Date(),
    }));
    for (const c of conns) this.connections.set(c.id, c);
    this.emit({ type: 'merge', connections: conns });
    return conns;
  }

  setValidator(fn: ValidatorFn) {
    this.validator = fn;
  }

  private validate(from: TerminalRef, tos: TerminalRef[], type: 'direct' | 'split' | 'merge') {
    if (!this.validator) return;
    const res = this.validator(from, tos, type);
    if (!res.valid) {
      const msg = res.errors.map((e) => e.message).join('; ');
      throw new Error(`Topology validation failed: ${msg}`);
    }
  }

  getTopology(): TopologySnapshot {
    return {
      nodes: Array.from(this.nodes.values()),
      pipes: Array.from(this.pipes.values()).map((p) => p.meta),
      connections: Array.from(this.connections.values()),
    };
  }

  // Backwards-compatible alias used by some older tests/specs
  getState(): TopologySnapshot {
    return this.getTopology();
  }

  exportJSON(): string {
    return JSON.stringify(this.getTopology(), null, 2);
  }

  exportMermaid(): string {
    const topo = this.getTopology();
    let diagram = 'graph LR\n';
    for (const n of topo.nodes) diagram += `  ${n.id}["${n.humanReadable ?? n.name}"]\n`;
    for (const c of topo.connections) for (const t of c.to) diagram += `  ${c.from} --> ${t}\n`;
    return diagram;
  }

  exportDOT(): string {
    const topo = this.getTopology();
    let dot = 'digraph Topology {\n';
    for (const n of topo.nodes) dot += `  "${n.id}" [label="${n.humanReadable ?? n.name}"];\n`;
    for (const c of topo.connections) for (const t of c.to) dot += `  "${c.from}" -> "${t}";\n`;
    dot += '}';
    return dot;
  }

  private parseAddress(addr: string): TerminalRef {
    const [nodeId, terminal] = addr.split('.');
    if (!nodeId || !terminal) throw new Error(`Invalid address: ${addr}`);
    return { nodeId, terminal };
  }

  private genId(prefix: string) {
    return `${prefix}-${Math.random().toString(16).slice(2, 8)}`;
  }
}
