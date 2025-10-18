import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';
import { debug } from '../debug/api.js';

export type LogEvent = {
  ts?: string; // ISO string; default now
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, unknown>;
};

export interface LoggingServerOptions {
  file: string;
  level?: LogEvent['level'];
  rotateBytes?: number; // rotate when file exceeds this size
  mkdir?: boolean; // create dir if needed
}

/**
 * LoggingServer: accepts JSONL log events and appends to a file with optional rotation.
 * - accepts: 'log/event' (JSONL)
 * - produces: none (side-effects to FS)
 */
export class LoggingServer {
  public readonly inputPipe: Pipe;
  private stream!: fs.WriteStream;
  private level: Required<NonNullable<LoggingServerOptions['level']>>;
  private rotateBytes: number;
  private file: string;

  constructor(private kernel: Kernel, opts: LoggingServerOptions) {
    this.inputPipe = kernel.createPipe();
    this.file = opts.file;
    this.level = (opts.level ?? 'info') as any;
    this.rotateBytes = opts.rotateBytes ?? 10 * 1024 * 1024; // 10MB default

    kernel.register(
      'logging-server',
      { type: 'output', accepts: ['log/event'], features: ['jsonl', 'rotate'] },
      this.inputPipe,
    );

    this.initStream(opts.mkdir !== false);
    this.bind();
  }

  private initStream(mkdir: boolean): void {
    const dir = path.dirname(this.file);
    if (mkdir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.stream = fs.createWriteStream(this.file, { flags: 'a' });
  }

  private severityRank(l: LogEvent['level']): number {
    const order: LogEvent['level'][] = ['trace', 'debug', 'info', 'warn', 'error'];
    return order.indexOf(l ?? 'info');
  }

  private shouldLog(level?: LogEvent['level']): boolean {
    return this.severityRank(level) >= this.severityRank(this.level);
  }

  private async maybeRotate(): Promise<void> {
    try {
      const st = fs.statSync(this.file);
      if (st.size >= this.rotateBytes) {
        this.stream.end();
        const stamp = new Date().toISOString().replace(/[:.]/g, '');
        const rotated = `${this.file}.${stamp}`;
        fs.renameSync(this.file, rotated);
        this.initStream(true);
        debug.emit('logging-server', 'rotated', { from: this.file, to: rotated, size: st.size }, 'info');
      }
    } catch {}
  }

  private bind(): void {
    let buffer = '';
    this.inputPipe.setEncoding('utf8');
    this.inputPipe.on('data', (chunk: string) => {
      buffer += chunk;
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        this.handleLine(line).catch((err) =>
          debug.emit('logging-server', 'error', { error: err?.message || String(err) }, 'error'),
        );
      }
    });
  }

  private async handleLine(line: string): Promise<void> {
    let evt: LogEvent;
    try {
      evt = JSON.parse(line);
    } catch (e: any) {
      // If not JSON, treat entire line as message
      evt = { level: 'info', message: line };
    }
    if (!this.shouldLog(evt.level)) return;

    const payload = {
      ts: evt.ts ?? new Date().toISOString(),
      level: evt.level ?? 'info',
      message: evt.message,
      ...(evt.fields ? { fields: evt.fields } : {}),
    };
    this.stream.write(JSON.stringify(payload) + '\n');
    await this.maybeRotate();
  }
}

