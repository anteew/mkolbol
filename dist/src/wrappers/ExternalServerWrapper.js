import { spawn } from 'child_process';
import crypto from 'node:crypto';
import { debug } from '../debug/api.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
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
    stdoutCapture = [];
    stderrCapture = [];
    captureLimit = 1024 * 100; // 100KB per stream
    currentCaptureSize = { stdout: 0, stderr: 0 };
    lastExitCode = null;
    lastSignal = null;
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
        debug.emit('external', 'server.starting', { servername: this.manifest.servername }, 'info');
        const env = { ...process.env, ...this.manifest.env };
        this.process = spawn(this.manifest.command, this.manifest.args, {
            cwd: this.manifest.cwd,
            env,
            stdio: this.manifest.ioMode === 'stdio' ? ['pipe', 'pipe', 'pipe'] : 'pipe'
        });
        this.spawnTime = Date.now();
        debug.emit('external', 'server.started', {
            servername: this.manifest.servername,
            pid: this.process.pid
        }, 'info');
        if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
            throw new Error('Failed to get process stdio streams');
        }
        this._inputPipe.on('data', (chunk) => {
            debug.emit('external', 'server.input', {
                servername: this.manifest.servername,
                bytes: chunk.length
            }, 'trace');
        });
        this._inputPipe.pipe(this.process.stdin);
        this.process.stdout.on('data', (chunk) => {
            this.captureOutput(chunk, 'stdout');
            debug.emit('external', 'server.output', {
                servername: this.manifest.servername,
                bytes: chunk.length
            }, 'trace');
        });
        this.process.stdout.pipe(this._outputPipe);
        this.process.stderr.on('data', (chunk) => {
            this.captureOutput(chunk, 'stderr');
            debug.emit('external', 'server.error', {
                servername: this.manifest.servername,
                bytes: chunk.length
            }, 'trace');
        });
        this.process.stderr.pipe(this._errorPipe);
        this.process.on('exit', (code, signal) => {
            this.handleExit(code, signal);
        });
        this.process.on('error', (err) => {
            console.error(`Process error for ${this.manifest.servername}:`, err);
        });
        // Note: registerWithHostess() is called by ExternalServerWrapper.spawn()
        // but the Executor now handles proper endpoint registration for ExternalProcess nodes
        await this.registerWithHostess();
        // Run health check if configured
        if (this.manifest.healthCheck) {
            await this.runHealthCheck();
        }
    }
    async restart() {
        debug.emit('external', 'server.restarting', {
            servername: this.manifest.servername,
            attempt: this.restartCount + 1,
            maxRestarts: this.manifest.maxRestarts
        }, 'info');
        await this.shutdown();
        const backoffDelay = this.calculateBackoffDelay();
        debug.emit('external', 'server.backoff', {
            servername: this.manifest.servername,
            delayMs: backoffDelay,
            attempt: this.restartCount + 1
        }, 'info');
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        this.restartCount++;
        this.clearCapture();
        await this.spawn();
    }
    calculateBackoffDelay() {
        const baseDelay = this.manifest.restartDelay || 1000;
        const exponentialDelay = baseDelay * Math.pow(2, this.restartCount);
        const maxDelay = 30000; // Cap at 30 seconds
        return Math.min(exponentialDelay, maxDelay);
    }
    async shutdown(timeout = 5000) {
        if (!this.process)
            return;
        debug.emit('external', 'server.stopping', { servername: this.manifest.servername }, 'info');
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
                debug.emit('external', 'server.stopped', { servername: this.manifest.servername }, 'info');
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
        const identity = this.hostess.register(this.manifest);
        this.hostess.registerEndpoint(identity, {
            type: 'external',
            coordinates: `${this.manifest.command} ${this.manifest.args.join(' ')}`,
            metadata: {
                cwd: this.manifest.cwd,
                ioMode: this.manifest.ioMode
            }
        });
    }
    async deregisterFromHostess() {
    }
    handleExit(code, signal) {
        this.lastExitCode = code;
        this.lastSignal = signal;
        const exitInfo = this.getExitCodeInfo(code, signal);
        debug.emit('external', 'server.exit', {
            servername: this.manifest.servername,
            exitCode: code,
            signal,
            exitType: exitInfo.type,
            exitMessage: exitInfo.message
        }, exitInfo.level);
        console.log(`Process ${this.manifest.servername} exited: ${exitInfo.message}`);
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
    getExitCodeInfo(code, signal) {
        if (signal) {
            return {
                type: 'signal',
                message: `killed by signal ${signal}`,
                level: 'warn'
            };
        }
        if (code === null) {
            return {
                type: 'unknown',
                message: 'exited with unknown status',
                level: 'warn'
            };
        }
        if (code === 0) {
            return {
                type: 'success',
                message: 'exited successfully (code 0)',
                level: 'info'
            };
        }
        // Common exit codes
        const exitCodeMap = {
            1: 'general error',
            2: 'misuse of shell builtin',
            126: 'command cannot execute',
            127: 'command not found',
            128: 'invalid exit argument',
            130: 'terminated by Ctrl+C (SIGINT)',
            137: 'killed (SIGKILL)',
            143: 'terminated (SIGTERM)'
        };
        const description = exitCodeMap[code] || `unknown error code ${code}`;
        return {
            type: 'failure',
            message: `exited with code ${code} (${description})`,
            level: 'error'
        };
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
    captureOutput(chunk, stream) {
        const capture = stream === 'stdout' ? this.stdoutCapture : this.stderrCapture;
        const currentSize = this.currentCaptureSize[stream];
        if (currentSize + chunk.length <= this.captureLimit) {
            capture.push(chunk);
            this.currentCaptureSize[stream] += chunk.length;
        }
        else {
            const remaining = this.captureLimit - currentSize;
            if (remaining > 0) {
                capture.push(chunk.slice(0, remaining));
                this.currentCaptureSize[stream] = this.captureLimit;
            }
        }
    }
    clearCapture() {
        this.stdoutCapture = [];
        this.stderrCapture = [];
        this.currentCaptureSize = { stdout: 0, stderr: 0 };
    }
    getCapturedStdout() {
        return Buffer.concat(this.stdoutCapture).toString('utf8');
    }
    getCapturedStderr() {
        return Buffer.concat(this.stderrCapture).toString('utf8');
    }
    getRestartCount() {
        return this.restartCount;
    }
    getLastExitCode() {
        return this.lastExitCode;
    }
    getLastSignal() {
        return this.lastSignal;
    }
    getExitInfo() {
        if (this.lastExitCode === null && this.lastSignal === null) {
            return null;
        }
        const info = this.getExitCodeInfo(this.lastExitCode, this.lastSignal);
        return info.message;
    }
    async runHealthCheck() {
        const config = this.manifest.healthCheck;
        const retries = config.retries || 3;
        const timeout = config.timeout || 5000;
        for (let attempt = 1; attempt <= retries; attempt++) {
            debug.emit('external', 'healthcheck.attempt', {
                servername: this.manifest.servername,
                type: config.type,
                attempt,
                maxRetries: retries
            }, 'info');
            try {
                if (config.type === 'command') {
                    await this.runCommandHealthCheck(config.command, timeout);
                }
                else if (config.type === 'http') {
                    await this.runHttpHealthCheck(config.url, timeout);
                }
                debug.emit('external', 'healthcheck.success', {
                    servername: this.manifest.servername,
                    attempt
                }, 'info');
                return;
            }
            catch (error) {
                const isLastAttempt = attempt === retries;
                debug.emit('external', 'healthcheck.failed', {
                    servername: this.manifest.servername,
                    attempt,
                    error: error instanceof Error ? error.message : String(error),
                    willRetry: !isLastAttempt
                }, isLastAttempt ? 'error' : 'warn');
                if (isLastAttempt) {
                    throw new Error(`Health check failed for ${this.manifest.servername} after ${retries} attempts: ${error instanceof Error ? error.message : String(error)}`);
                }
                // Exponential backoff between retries
                const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
    }
    async runCommandHealthCheck(command, timeout) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Command health check timed out after ${timeout}ms`)), timeout);
        });
        const execPromise = execAsync(command, {
            cwd: this.manifest.cwd,
            env: { ...process.env, ...this.manifest.env },
            timeout
        });
        try {
            const result = await Promise.race([execPromise, timeoutPromise]);
            if (result.stderr) {
                debug.emit('external', 'healthcheck.command.stderr', {
                    servername: this.manifest.servername,
                    stderr: result.stderr
                }, 'trace');
            }
        }
        catch (error) {
            if (error.code !== undefined && error.code !== 0) {
                throw new Error(`Command exited with code ${error.code}`);
            }
            throw error;
        }
    }
    async runHttpHealthCheck(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET'
            });
            if (!response.ok) {
                throw new Error(`HTTP health check returned status ${response.status}`);
            }
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`HTTP health check timed out after ${timeout}ms`);
            }
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
//# sourceMappingURL=ExternalServerWrapper.js.map