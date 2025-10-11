import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';
import * as fs from 'fs';
import * as path from 'path';

export class LoggerRenderer {
  public readonly inputPipe: Pipe;
  private writeStream: fs.WriteStream;

  constructor(kernel: Kernel, logFilePath: string) {
    this.inputPipe = kernel.createPipe();
    
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.writeStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    
    this.inputPipe.on('data', (data: Buffer) => {
      this.writeStream.write(data);
    });

    this.inputPipe.on('error', (err) => {
      console.error('LoggerRenderer error:', err);
    });
  }

  destroy(): void {
    this.inputPipe.removeAllListeners();
    this.writeStream.end();
  }
}
