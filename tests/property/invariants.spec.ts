import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Kernel } from '../../src/kernel/Kernel';
import { Writable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

const SEED = 42;

function logFailure(testName: string, seed: number, error: string) {
  const summaryPath = 'reports/summary.jsonl';
  const dir = path.dirname(summaryPath);
  fs.mkdirSync(dir, { recursive: true });

  const entry = {
    status: 'fail',
    duration: 0,
    location: `tests/property/invariants.spec.ts:${testName}`,
    seed,
    error,
  };

  fs.appendFileSync(summaryPath, JSON.stringify(entry) + '\n');
}

describe('Property-based invariants (seeded)', () => {
  it('split: all destinations receive identical data', async () => {
    const testName = 'split-identical-data';
    try {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 10 }),
          async (data) => {
            const k = new Kernel();
            const src = k.createPipe({ objectMode: true });
            const collected: unknown[][] = [[], []];

            const destinations = collected.map(
              (arr) =>
                new Writable({
                  objectMode: true,
                  write(chunk, _enc, cb) {
                    arr.push(chunk);
                    cb();
                  },
                }),
            );

            k.split(src, destinations as any);

            for (const item of data) {
              src.write(item);
            }
            src.end();

            await new Promise((r) => setImmediate(r));

            expect(collected[0]).toEqual(data);
            expect(collected[1]).toEqual(data);
            expect(collected[0]).toEqual(collected[1]);
          },
        ),
        { seed: SEED, numRuns: 50 },
      );
    } catch (error: any) {
      logFailure(testName, SEED, error.message || String(error));
      throw error;
    }
  });

  it('split: order preservation across destinations', async () => {
    const testName = 'split-order-preservation';
    try {
      await fc.assert(
        fc.asyncProperty(fc.array(fc.string(), { minLength: 1, maxLength: 15 }), async (data) => {
          const k = new Kernel();
          const src = k.createPipe({ objectMode: true });
          const collected: unknown[][] = [[], [], []];

          const destinations = collected.map(
            (arr) =>
              new Writable({
                objectMode: true,
                write(chunk, _enc, cb) {
                  arr.push(chunk);
                  cb();
                },
              }),
          );

          k.split(src, destinations as any);

          for (const item of data) {
            src.write(item);
          }
          src.end();

          await new Promise((r) => setImmediate(r));

          for (let i = 0; i < collected.length; i++) {
            expect(collected[i]).toEqual(data);
          }
        }),
        { seed: SEED, numRuns: 50 },
      );
    } catch (error: any) {
      logFailure(testName, SEED, error.message || String(error));
      throw error;
    }
  });

  it('merge: all source data reaches destination', async () => {
    const testName = 'merge-completeness';
    try {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 5 }),
            fc.array(fc.integer({ min: 101, max: 200 }), { minLength: 0, maxLength: 5 }),
          ),
          async ([data1, data2]) => {
            const k = new Kernel();
            const s1 = k.createPipe({ objectMode: true });
            const s2 = k.createPipe({ objectMode: true });
            const out: unknown[] = [];

            const dest = new Writable({
              objectMode: true,
              write(chunk, _enc, cb) {
                out.push(chunk);
                cb();
              },
            });

            const merged = k.createPipe({ objectMode: true });
            k.merge([s1, s2], merged);
            k.connect(merged, dest as any);

            for (const item of data1) {
              s1.write(item);
            }
            for (const item of data2) {
              s2.write(item);
            }
            s1.end();
            s2.end();

            await new Promise((r) => setImmediate(r));

            const expected = [...data1, ...data2];
            expect(out.sort()).toEqual(expected.sort());
            expect(out.length).toBe(expected.length);
          },
        ),
        { seed: SEED, numRuns: 50 },
      );
    } catch (error: any) {
      logFailure(testName, SEED, error.message || String(error));
      throw error;
    }
  });

  it('merge: no data loss with concurrent writes', async () => {
    const testName = 'merge-no-loss';
    try {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.array(fc.string(), { minLength: 1, maxLength: 8 }),
            fc.array(fc.string(), { minLength: 1, maxLength: 8 }),
            fc.array(fc.string(), { minLength: 1, maxLength: 8 }),
          ),
          async ([data1, data2, data3]) => {
            const k = new Kernel();
            const sources = [
              k.createPipe({ objectMode: true }),
              k.createPipe({ objectMode: true }),
              k.createPipe({ objectMode: true }),
            ];
            const out: unknown[] = [];

            const dest = new Writable({
              objectMode: true,
              write(chunk, _enc, cb) {
                out.push(chunk);
                cb();
              },
            });

            const merged = k.createPipe({ objectMode: true });
            k.merge(sources, merged);
            k.connect(merged, dest as any);

            const allData = [data1, data2, data3];
            for (let i = 0; i < sources.length; i++) {
              for (const item of allData[i]) {
                sources[i].write(item);
              }
              sources[i].end();
            }

            await new Promise((r) => setImmediate(r));

            const expected = [...data1, ...data2, ...data3];
            expect(out.length).toBe(expected.length);

            for (const item of expected) {
              expect(out).toContain(item);
            }
          },
        ),
        { seed: SEED, numRuns: 50 },
      );
    } catch (error: any) {
      logFailure(testName, SEED, error.message || String(error));
      throw error;
    }
  });

  it('split-then-merge: roundtrip preserves all data', async () => {
    const testName = 'split-merge-roundtrip';
    try {
      await fc.assert(
        fc.asyncProperty(fc.array(fc.integer(), { minLength: 1, maxLength: 10 }), async (data) => {
          const k = new Kernel();
          const src = k.createPipe({ objectMode: true });

          const intermediate1 = k.createPipe({ objectMode: true });
          const intermediate2 = k.createPipe({ objectMode: true });

          k.split(src, [intermediate1, intermediate2]);

          const merged = k.createPipe({ objectMode: true });
          k.merge([intermediate1, intermediate2], merged);

          const out: unknown[] = [];
          const dest = new Writable({
            objectMode: true,
            write(chunk, _enc, cb) {
              out.push(chunk);
              cb();
            },
          });
          k.connect(merged, dest as any);

          for (const item of data) {
            src.write(item);
          }
          src.end();

          await new Promise((r) => setTimeout(r, 20));

          expect(out.length).toBe(data.length * 2);

          const expected: Record<string, number> = {};
          for (const item of data) {
            const key = String(item);
            expected[key] = (expected[key] || 0) + 2;
          }

          const actual: Record<string, number> = {};
          for (const item of out) {
            const key = String(item);
            actual[key] = (actual[key] || 0) + 1;
          }

          expect(actual).toEqual(expected);
        }),
        { seed: SEED, numRuns: 50 },
      );
    } catch (error: any) {
      logFailure(testName, SEED, error.message || String(error));
      throw error;
    }
  });

  it('empty split: source with zero destinations completes', async () => {
    const testName = 'empty-split';
    try {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 0, max: 10 }), async (numItems) => {
          const k = new Kernel();
          const src = k.createPipe({ objectMode: true });

          k.split(src, []);

          for (let i = 0; i < numItems; i++) {
            src.write(i);
          }
          src.end();

          await new Promise((r) => setImmediate(r));

          expect(true).toBe(true);
        }),
        { seed: SEED, numRuns: 30 },
      );
    } catch (error: any) {
      logFailure(testName, SEED, error.message || String(error));
      throw error;
    }
  });

  it('empty merge: destination with zero sources completes', async () => {
    const testName = 'empty-merge';
    try {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async (_) => {
          const k = new Kernel();
          const merged = k.createPipe({ objectMode: true });
          const out: unknown[] = [];

          const dest = new Writable({
            objectMode: true,
            write(chunk, _enc, cb) {
              out.push(chunk);
              cb();
            },
          });

          k.merge([], merged);
          k.connect(merged, dest as any);

          await new Promise((r) => setImmediate(r));

          expect(out).toEqual([]);
        }),
        { seed: SEED, numRuns: 10 },
      );
    } catch (error: any) {
      logFailure(testName, SEED, error.message || String(error));
      throw error;
    }
  });
});
