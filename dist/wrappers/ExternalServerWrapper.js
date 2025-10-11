import { spawn } from 'child_process';
import crypto from 'node:crypto';
export class ExternalServerWrapper {
    kernel;
    hostess;
    manifest;
    process;
    _inputPipe;
    _outputPipe;
    _errorPipe;
    restartCount = 0;
    spawnTime = 0;
    explicitShutdown = false;
    constructor(kernel, hostess, manifest) {
        this.kernel = kernel;
        this.hostess = hostess;
        this.manifest = manifest;
        this._inputPipe = kernel.createPipe();
        this._outputPipe = kernel.createPipe();
        this._errorPipe = kernel.createPipe();
        if (!manifest.uuid) {
            manifest.uuid = crypto.randomUUID();
        }
        if (!manifest.restart) {
            manifest.restart = 'never';
        }
        if (!manifest.restartDelay) {
            manifest.restartDelay = 5000;
        }
        if (!manifest.maxRestarts) {
            manifest.maxRestarts = 3;
        }
    }
    get inputPipe() {
        return this._inputPipe;
    }
    get outputPipe() {
        return this._outputPipe;
    }
    get errorPipe() {
        return this._errorPipe;
    }
    async spawn() {
        if (this.process) {
            throw new Error(`Process already running for ${this.manifest.servername}`);
        }
        const env = { ...process.env, ...this.manifest.env };
        this.process = spawn(this.manifest.command, this.manifest.args, {
            cwd: this.manifest.cwd,
            env,
            stdio: this.manifest.ioMode === 'stdio' ? ['pipe', 'pipe', 'pipe'] : 'pipe'
        });
        this.spawnTime = Date.now();
        if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
            throw new Error('Failed to get process stdio streams');
        }
        this._inputPipe.pipe(this.process.stdin);
        this.process.stdout.pipe(this._outputPipe);
        this.process.stderr.pipe(this._errorPipe);
        this.process.on('exit', (code, signal) => {
            this.handleExit(code, signal);
        });
        this.process.on('error', (err) => {
            console.error(`Process error for ${this.manifest.servername}:`, err);
        });
        await this.registerWithHostess();
    }
    async restart() {
        await this.shutdown();
        if (this.manifest.restartDelay) {
            await new Promise(resolve => setTimeout(resolve, this.manifest.restartDelay));
        }
        this.restartCount++;
        await this.spawn();
    }
    async shutdown(timeout = 5000) {
        if (!this.process)
            return;
        this.explicitShutdown = true;
        return new Promise((resolve) => {
            if (!this.process) {
                resolve();
                return;
            }
            const killTimer = setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill('SIGKILL');
                }
            }, timeout);
            this.process.once('exit', () => {
                clearTimeout(killTimer);
                this.process = undefined;
                resolve();
            });
            this.process.kill('SIGTERM');
        });
    }
    isRunning() {
        return this.process !== undefined && !this.process.killed;
    }
    getProcessInfo() {
        if (!this.process) {
            throw new Error('Process not running');
        }
        const uptime = Date.now() - this.spawnTime;
        const memoryUsage = process.memoryUsage().heapUsed;
        const cpuUsage = 0;
        return {
            pid: this.process.pid,
            uptime,
            memoryUsage,
            cpuUsage
        };
    }
    sendSignal(signal) {
        if (!this.process) {
            throw new Error('Process not running');
        }
        this.process.kill(signal);
    }
    async registerWithHostess() {
        this.hostess.register(this.manifest);
    }
    async deregisterFromHostess() {
    }
    handleExit(code, signal) {
        console.log(`Process ${this.manifest.servername} exited with code ${code}, signal ${signal}`);
        this.process = undefined;
        if (this.explicitShutdown) {
            this.explicitShutdown = false;
            return;
        }
        if (this.shouldRestart(code)) {
            console.log(`Restarting ${this.manifest.servername} (attempt ${this.restartCount + 1}/${this.manifest.maxRestarts})`);
            this.restart().catch(err => {
                console.error(`Failed to restart ${this.manifest.servername}:`, err);
            });
        }
    }
    shouldRestart(exitCode) {
        const { restart, maxRestarts } = this.manifest;
        if (restart === 'never')
            return false;
        if (this.restartCount >= maxRestarts)
            return false;
        if (restart === 'always')
            return true;
        if (restart === 'on-failure')
            return exitCode !== 0;
        return false;
    }
}
//# sourceMappingURL=ExternalServerWrapper.js.map