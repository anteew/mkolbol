import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

export interface MaskRule {
  pattern: RegExp;
  replacement: string;
}

export interface GoldenOptions {
  suite: string;
  case: string;
  masks?: MaskRule[];
}

const DEFAULT_MASKS: MaskRule[] = [
  { pattern: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, replacement: '<TIMESTAMP>' },
  {
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    replacement: '<UUID>',
  },
  { pattern: /\d{13,}/g, replacement: '<TIMESTAMP_MS>' },
];

export class GoldenHarness {
  private options: GoldenOptions;
  private masks: MaskRule[];

  constructor(options: GoldenOptions) {
    this.options = options;
    this.masks = [...DEFAULT_MASKS, ...(options.masks || [])];
  }

  private applyMasks(content: string): string {
    let masked = content;
    for (const rule of this.masks) {
      masked = masked.replace(rule.pattern, rule.replacement);
    }
    return masked;
  }

  private getSnapshotPath(): string {
    return join('reports', this.options.suite, `${this.options.case}.snap`);
  }

  snapshot(content: string): void {
    const masked = this.applyMasks(content);
    const snapPath = this.getSnapshotPath();
    const snapDir = dirname(snapPath);

    if (!existsSync(snapDir)) {
      mkdirSync(snapDir, { recursive: true });
    }

    writeFileSync(snapPath, masked, 'utf-8');
  }

  compare(content: string): { match: boolean; expected?: string; actual?: string } {
    const masked = this.applyMasks(content);
    const snapPath = this.getSnapshotPath();

    if (!existsSync(snapPath)) {
      this.snapshot(content);
      return { match: true };
    }

    const expected = readFileSync(snapPath, 'utf-8');
    const match = expected === masked;

    return { match, expected, actual: masked };
  }

  assertSnapshot(content: string): void {
    const result = this.compare(content);
    if (!result.match) {
      throw new Error(
        `Snapshot mismatch for ${this.options.suite}/${this.options.case}\n` +
          `Expected:\n${result.expected}\n\nActual:\n${result.actual}`,
      );
    }
  }
}

export function createGoldenHarness(options: GoldenOptions): GoldenHarness {
  return new GoldenHarness(options);
}
