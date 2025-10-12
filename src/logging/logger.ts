import * as fs from 'fs';
import * as path from 'path';
import { TestEventEnvelope, LogLevel, createEvent } from './TestEvent.js';

export class TestLogger {
  private suite: string;
  private caseName: string;
  private outputPath: string;
  private stream?: fs.WriteStream;

  constructor(suite: string, caseName: string) {
    this.suite = suite;
    this.caseName = caseName;
    this.outputPath = path.join('reports', suite, `${caseName}.jsonl`);
  }

  private ensureStream(): fs.WriteStream {
    if (!this.stream) {
      const dir = path.dirname(this.outputPath);
      fs.mkdirSync(dir, { recursive: true });
      this.stream = fs.createWriteStream(this.outputPath, { flags: 'a' });
    }
    return this.stream;
  }

  beginCase(phase?: string): void {
    const event = createEvent('case.begin', this.caseName, { phase });
    this.writeEvent(event);
  }

  endCase(phase?: string, payload?: unknown): void {
    const event = createEvent('case.end', this.caseName, { phase, payload });
    this.writeEvent(event);
  }

  emit<T = unknown>(
    evt: string,
    options: {
      lvl?: LogLevel;
      phase?: string;
      id?: string;
      corr?: string;
      path?: string;
      payload?: T;
    } = {}
  ): void {
    const event = createEvent(evt, this.caseName, options);
    this.writeEvent(event);
  }

  private writeEvent(event: TestEventEnvelope): void {
    const stream = this.ensureStream();
    stream.write(JSON.stringify(event) + '\n');
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = undefined;
    }
  }
}

export function createLogger(suite: string, caseName: string): TestLogger {
  return new TestLogger(suite, caseName);
}
