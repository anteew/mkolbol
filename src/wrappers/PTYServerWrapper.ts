import * as pty from 'node-pty';
import { ExternalServerWrapper } from './ExternalServerWrapper.js';
import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import type { ExternalServerManifest } from '../types.js';
import { debug } from '../debug/api.js';

export class PTYServerWrapper extends ExternalServerWrapper {
  private ptyProcess?: pty.IPty;
  private terminalSize: { cols: number; rows: number };
  private dataDisposable?: { dispose: () => void };

  constructor(
    kernel: Kernel,
    hostess: Hostess,
    manifest: ExternalServerManifest
  ) {
    super(kernel, hostess, manifest);
    
    this.terminalSize = {
      cols: manifest.initialCols || 80,
      rows: manifest.initialRows || 24
    };
  }

  async spawn(): Promise<void> {
    if (this.ptyProcess) {
      throw new Error(`PTY process already running for ${this.manifest.servername}`);
    }

    debug.emit('pty', 'server.starting', { servername: this.manifest.servername }, 'info');

    const env = { ...process.env, ...this.manifest.env };
    const shell = this.manifest.shell || this.manifest.command;
    const args = this.manifest.shellArgs || this.manifest.args;

    this.ptyProcess = pty.spawn(shell, args, {
      name: this.manifest.terminalType || 'xterm-256color',
      cols: this.terminalSize.cols,
      rows: this.terminalSize.rows,
      cwd: this.manifest.cwd,
      env,
      encoding: (this.manifest.encoding || 'utf8') as any
    });

    this.spawnTime = Date.now();

    debug.emit('pty', 'server.started', { 
      servername: this.manifest.servername, 
      pid: this.ptyProcess.pid 
    }, 'info');

    this.dataDisposable = this.ptyProcess.onData((data) => {
      debug.emit('pty', 'server.output', { 
        servername: this.manifest.servername, 
        bytes: data.length 
      }, 'trace');
      this._outputPipe.write(data);
    });

    this.ptyProcess.onExit(() => {
      this.ptyProcess = undefined;
      if (this.dataDisposable) {
        this.dataDisposable.dispose();
        this.dataDisposable = undefined;
      }
    });

    this._inputPipe.on('data', (data) => {
      if (this.ptyProcess) {
        debug.emit('pty', 'server.input', { 
          servername: this.manifest.servername, 
          bytes: data.length 
        }, 'trace');
        this.ptyProcess.write(data.toString());
      }
    });

    await this.registerWithHostess();
  }

  protected async registerWithHostess(): Promise<void> {
    const identity = this.hostess.register(this.manifest);

    this.hostess.registerEndpoint(identity, {
      type: 'pty',
      coordinates: `pid:${this.ptyProcess?.pid}`,
      metadata: {
        cols: this.terminalSize.cols,
        rows: this.terminalSize.rows,
        terminalType: this.manifest.terminalType || 'xterm-256color'
      }
    });
  }

  resize(cols: number, rows: number): void {
    if (!this.ptyProcess) {
      throw new Error('PTY process not running');
    }
    
    this.terminalSize = { cols, rows };
    this.ptyProcess.resize(cols, rows);
  }

  async shutdown(timeout: number = 100): Promise<void> {
    if (!this.ptyProcess) return;

    debug.emit('pty', 'server.stopping', { servername: this.manifest.servername }, 'info');

    this.explicitShutdown = true;
    
    if (this.dataDisposable) {
      this.dataDisposable.dispose();
      this.dataDisposable = undefined;
    }
    
    const pty = this.ptyProcess;
    this.ptyProcess = undefined;
    
    try {
      pty.kill('SIGKILL');
    } catch (err) {
    }
    
    debug.emit('pty', 'server.stopped', { servername: this.manifest.servername }, 'info');
    
    await new Promise(resolve => setTimeout(resolve, timeout));
  }

  sendSignal(signal: string): void {
    if (!this.ptyProcess) {
      throw new Error('PTY process not running');
    }
    this.ptyProcess.kill(signal);
  }

  isRunning(): boolean {
    return this.ptyProcess !== undefined;
  }

  getProcessInfo() {
    if (!this.ptyProcess) {
      throw new Error('PTY process not running');
    }

    const uptime = Date.now() - this.spawnTime;
    const memoryUsage = process.memoryUsage().heapUsed;
    const cpuUsage = 0;

    return {
      pid: this.ptyProcess.pid,
      uptime,
      memoryUsage,
      cpuUsage
    };
  }

  async restart(): Promise<void> {
    await this.shutdown();
    
    if (this.manifest.restartDelay) {
      await new Promise(resolve => setTimeout(resolve, this.manifest.restartDelay));
    }
    
    this.restartCount++;
    await this.spawn();
  }
}
