import { describe, it, expect } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { StateManager } from '../../src/state/StateManager.js';
import type { TerminalRef, ValidationResult } from '../../src/types/topology.js';

describe('StateManager', () => {
  it('adds nodes and emits events', () => {
    const sm = new StateManager(new Kernel());
    const events: any[] = [];
    const unsub = sm.subscribe((e) => events.push(e));
    const node = sm.addNode({
      id: 'parser-1',
      name: 'Parser',
      terminals: [
        { name: 'input', direction: 'input' },
        { name: 'output', direction: 'output' },
      ],
    });
    expect(node.id).toBe('parser-1');
    expect(events.some((e) => e.type === 'node-added')).toBeTruthy();
    unsub();
  });

  it('connects and emits connected', () => {
    const sm = new StateManager(new Kernel());
    sm.addNode({ id: 'a', terminals: [{ name: 'output', direction: 'output' }] });
    sm.addNode({ id: 'b', terminals: [{ name: 'input', direction: 'input' }] });
    const evts: any[] = [];
    sm.subscribe((e) => evts.push(e));
    const conn = sm.connect('a.output', 'b.input');
    expect(conn.type).toBe('direct');
    expect(evts.find((e) => e.type === 'connected')).toBeTruthy();
  });

  it('split and merge emit events', () => {
    const sm = new StateManager(new Kernel());
    sm.addNode({ id: 'src', terminals: [{ name: 'out', direction: 'output' }] });
    sm.addNode({ id: 'x', terminals: [{ name: 'in', direction: 'input' }] });
    sm.addNode({ id: 'y', terminals: [{ name: 'in', direction: 'input' }] });

    const evts: any[] = [];
    sm.subscribe((e) => evts.push(e));
    const splitConns = sm.split('src.out', ['x.in', 'y.in']);
    expect(splitConns.length).toBe(2);
    expect(evts.find((e) => e.type === 'split')).toBeTruthy();

    const sm2 = new StateManager(new Kernel());
    sm2.addNode({ id: 'a', terminals: [{ name: 'out', direction: 'output' }] });
    sm2.addNode({ id: 'b', terminals: [{ name: 'out', direction: 'output' }] });
    sm2.addNode({ id: 'dst', terminals: [{ name: 'in', direction: 'input' }] });
    const evts2: any[] = [];
    sm2.subscribe((e) => evts2.push(e));
    const mergeConns = sm2.merge(['a.out', 'b.out'], 'dst.in');
    expect(mergeConns.length).toBe(2);
    expect(evts2.find((e) => e.type === 'merge')).toBeTruthy();
  });

  it('validator enforces directionality when set', () => {
    const sm = new StateManager(new Kernel());
    sm.addNode({ id: 'a', terminals: [{ name: 'out', direction: 'output' }] });
    sm.addNode({ id: 'b', terminals: [{ name: 'in', direction: 'input' }] });

    sm.setValidator((from: TerminalRef, tos: TerminalRef[], _type): ValidationResult => {
      const [to] = tos;
      const ok = from.terminal === 'out' && to.terminal === 'in';
      return ok ? { valid: true, errors: [] } : { valid: false, errors: [{ message: 'direction mismatch' }] };
    });

    const ok = sm.connect('a.out', 'b.in');
    expect(ok).toBeTruthy();

    const smBad = new StateManager(new Kernel());
    smBad.addNode({ id: 'x', terminals: [{ name: 'in', direction: 'input' }] });
    smBad.addNode({ id: 'y', terminals: [{ name: 'out', direction: 'output' }] });
    smBad.setValidator((from: TerminalRef, tos: TerminalRef[], _type): ValidationResult => {
      const [to] = tos;
      const ok2 = from.terminal === 'out' && to.terminal === 'in';
      return ok2 ? { valid: true, errors: [] } : { valid: false, errors: [{ message: 'direction mismatch' }] };
    });
    expect(() => smBad.connect('x.in', 'y.out')).toThrow();
  });

  it('exporters produce strings', () => {
    const sm = new StateManager(new Kernel());
    sm.addNode({ id: 'a', name: 'A', terminals: [{ name: 'out', direction: 'output' }] });
    sm.addNode({ id: 'b', name: 'B', terminals: [{ name: 'in', direction: 'input' }] });
    sm.connect('a.out', 'b.in');
    const json = sm.exportJSON();
    const mermaid = sm.exportMermaid();
    const dot = sm.exportDOT();
    expect(json.includes('"nodes"')).toBeTruthy();
    expect(mermaid.includes('graph LR')).toBeTruthy();
    expect(dot.includes('digraph Topology')).toBeTruthy();
  });
});
