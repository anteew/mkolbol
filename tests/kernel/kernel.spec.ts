import { describe, it, expect } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel';
import { Writable } from 'stream';

describe('Kernel', () => {
  it('connect moves data 1:1', async () => {
    const k = new Kernel();
    const src = k.createPipe({ objectMode: true });
    const seen: unknown[] = [];
    const dest = new Writable({
      objectMode: true,
      write(chunk, _enc, cb) {
        seen.push(chunk);
        cb();
      },
    });
    k.connect(src, dest as any);
    src.write(1);
    src.write(2);
    src.end();
    await new Promise((r) => setImmediate(r));
    expect(seen).toEqual([1, 2]);
  });

  it('split fans out to multiple destinations', async () => {
    const k = new Kernel();
    const src = k.createPipe({ objectMode: true });
    const a: unknown[] = [],
      b: unknown[] = [];
    const destA = new Writable({
      objectMode: true,
      write(c, _e, cb) {
        a.push(c);
        cb();
      },
    });
    const destB = new Writable({
      objectMode: true,
      write(c, _e, cb) {
        b.push(c);
        cb();
      },
    });
    k.split(src, [destA as any, destB as any]);
    src.write('x');
    src.end();
    await new Promise((r) => setImmediate(r));
    expect(a).toEqual(['x']);
    expect(b).toEqual(['x']);
  });

  it('merge combines multiple sources into one destination', async () => {
    const k = new Kernel();
    const s1 = k.createPipe({ objectMode: true });
    const s2 = k.createPipe({ objectMode: true });
    const out: unknown[] = [];
    const dest = new Writable({
      objectMode: true,
      write(c, _e, cb) {
        out.push(c);
        cb();
      },
    });
    const merged = k.createPipe({ objectMode: true });
    k.merge([s1, s2], merged);
    k.connect(merged, dest as any);
    s1.write('a');
    s2.write('b');
    s1.end();
    s2.end();
    await new Promise((r) => setImmediate(r));
    expect(out).toEqual(['a', 'b']);
  });

  it('register/lookup filters by capabilities', () => {
    const k = new Kernel();
    const p = k.createPipe();
    k.register(
      'xterm-parser',
      { accepts: ['raw-ansi'], produces: ['terminal-state'], type: 'transform' },
      p,
    );
    const found = k.lookup({ accepts: 'raw-ansi', produces: 'terminal-state' });
    expect(found).toHaveLength(1);
  });
});
