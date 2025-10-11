import * as pty from 'node-pty';
import { ExternalServerWrapper } from './ExternalServerWrapper.js';
export class PTYServerWrapper extends ExternalServerWrapper {
    ptyProcess;
    terminalSize;
    dataDisposable;
    constructor(kernel, hostess, manifest) {
        super(kernel, hostess, manifest);
        this.terminalSize = {
            cols: manifest.initialCols || 80,
            rows: manifest.initialRows || 24
        };
    }
    async spawn() {
        if (this.ptyProcess) {
            throw new Error(`PTY process already running for ${this.manifest.servername}`);
        }
        const env = { ...process.env, ...this.manifest.env };
        const shell = this.manifest.shell || this.manifest.command;
        const args = this.manifest.shellArgs || this.manifest.args;
        this.ptyProcess = pty.spawn(shell, args, {
            name: this.manifest.terminalType || 'xterm-256color',
            cols: this.terminalSize.cols,
            rows: this.terminalSize.rows,
            cwd: this.manifest.cwd,
            env,
            encoding: (this.manifest.encoding || 'utf8')
        });
        this.spawnTime = Date.now();
        this.dataDisposable = this.ptyProcess.onData((data) => {
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
                this.ptyProcess.write(data.toString());
            }
        });
        await this.registerWithHostess();
    }
    resize(cols, rows) {
        if (!this.ptyProcess) {
            throw new Error('PTY process not running');
        }
        this.terminalSize = { cols, rows };
        this.ptyProcess.resize(cols, rows);
    }
    async shutdown(timeout = 100) {
        if (!this.ptyProcess)
            return;
        this.explicitShutdown = true;
        if (this.dataDisposable) {
            this.dataDisposable.dispose();
            this.dataDisposable = undefined;
        }
        const pty = this.ptyProcess;
        this.ptyProcess = undefined;
        try {
            pty.kill('SIGKILL');
        }
        catch (err) {
        }
        await new Promise(resolve => setTimeout(resolve, timeout));
    }
    sendSignal(signal) {
        if (!this.ptyProcess) {
            throw new Error('PTY process not running');
        }
        this.ptyProcess.kill(signal);
    }
    isRunning() {
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
    async restart() {
        await this.shutdown();
        if (this.manifest.restartDelay) {
            await new Promise(resolve => setTimeout(resolve, this.manifest.restartDelay));
        }
        this.restartCount++;
        await this.spawn();
    }
}
//# sourceMappingURL=PTYServerWrapper.js.map