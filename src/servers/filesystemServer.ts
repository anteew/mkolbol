import { createReadStream, promises as fsp, constants as fsConstants, WriteStream, createWriteStream } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';
import { debug } from '../debug/api.js';

type FsReq = {
  id: string;
  op:
    | 'stat'
    | 'readFile'
    | 'writeFile'
    | 'appendFile'
    | 'rm'
    | 'mkdirp'
    | 'readdir'
    | 'exists'
    | 'readStream';
  path: string;
  dataBase64?: string;
  encoding?: BufferEncoding;
};

type FsRes = {
  id: string;
  ok: boolean;
  error?: string;
  stat?: any;
  dataBase64?: string;
  entries?: string[];
  exists?: boolean;
  info?: any;
};

/**
 * FilesystemServer: a simple JSONL request/response server over streams.
 * - accepts: 'fs/request'
 * - produces: 'fs/response' (JSONL) and raw bytes for 'readStream' (framed via newline-delimited dataBase64 chunks)
 */
export class FilesystemServer {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;
  private streamOut?: WriteStream;

  constructor(private kernel: Kernel, private rootDir: string = process.cwd()) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();

    kernel.register(
      'filesystem-server',
      {
        type: 'transform',
        accepts: ['fs/request'],
        produces: ['fs/response'],
        features: ['jsonl', 'in-memory'],
      },
      this.inputPipe,
    );

    this.bind();
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
        this.handleLine(line).catch((err) => this.emitError('unknown', err));
      }
    });
  }

  private async handleLine(line: string): Promise<void> {
    let req: FsReq;
    try {
      req = JSON.parse(line);
    } catch (e: any) {
      this.emit({ id: 'parse-error', ok: false, error: `Invalid JSON: ${e.message}` });
      return;
    }

    const full = resolve(this.rootDir, req.path);
    debug.emit('fs-server', 'request', { id: req.id, op: req.op, path: req.path, full });

    try {
      switch (req.op) {
        case 'exists': {
          try {
            await fsp.access(full, fsConstants.F_OK);
            this.emit({ id: req.id, ok: true, exists: true });
          } catch {
            this.emit({ id: req.id, ok: true, exists: false });
          }
          break;
        }
        case 'stat': {
          const st = await fsp.stat(full);
          this.emit({ id: req.id, ok: true, stat: { ...st, isDir: st.isDirectory(), isFile: st.isFile() } });
          break;
        }
        case 'readdir': {
          const entries = await fsp.readdir(full);
          this.emit({ id: req.id, ok: true, entries });
          break;
        }
        case 'mkdirp': {
          await fsp.mkdir(full, { recursive: true });
          this.emit({ id: req.id, ok: true, info: { created: true, path: full } });
          break;
        }
        case 'rm': {
          await fsp.rm(full, { recursive: true, force: true });
          this.emit({ id: req.id, ok: true, info: { removed: true } });
          break;
        }
        case 'writeFile': {
          const buf = Buffer.from(req.dataBase64 || '', 'base64');
          await fsp.mkdir(dirname(full), { recursive: true });
          await fsp.writeFile(full, buf, req.encoding ?? 'utf8');
          this.emit({ id: req.id, ok: true, info: { bytes: buf.length, path: full } });
          break;
        }
        case 'appendFile': {
          const buf = Buffer.from(req.dataBase64 || '', 'base64');
          await fsp.mkdir(dirname(full), { recursive: true });
          await fsp.appendFile(full, buf, req.encoding ?? 'utf8');
          this.emit({ id: req.id, ok: true, info: { bytes: buf.length, path: full } });
          break;
        }
        case 'readFile': {
          const data = await fsp.readFile(full);
          this.emit({ id: req.id, ok: true, dataBase64: data.toString('base64') });
          break;
        }
        case 'readStream': {
          await fsp.access(full, fsConstants.F_OK);
          const rs = createReadStream(full);
          rs.on('data', (chunk) => {
            const line = JSON.stringify({ id: req.id, ok: true, chunkBase64: Buffer.from(chunk).toString('base64') }) + '\n';
            this.outputPipe.write(line);
          });
          rs.on('end', () => {
            const line = JSON.stringify({ id: req.id, ok: true, done: true, name: basename(full) }) + '\n';
            this.outputPipe.write(line);
          });
          rs.on('error', (err) => this.emitError(req.id, err));
          break;
        }
        default:
          this.emit({ id: req.id, ok: false, error: `Unsupported op: ${req.op}` });
      }
    } catch (err: any) {
      this.emitError(req.id, err);
    }
  }

  private emit(res: FsRes): void {
    this.outputPipe.write(JSON.stringify(res) + '\n');
  }

  private emitError(id: string, err: any): void {
    const msg = err?.message || String(err);
    debug.emit('fs-server', 'error', { id, error: msg }, 'error');
    this.emit({ id, ok: false, error: msg });
  }
}

