import { ChildProcess } from 'child_process';
import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import type { Pipe } from '../types/stream.js';
import type { ExternalServerManifest, ProcessInfo } from '../types.js';
export declare class ExternalServerWrapper {
    protected kernel: Kernel;
    protected hostess: Hostess;
    manifest: ExternalServerManifest;
    protected process?: ChildProcess;
    protected _inputPipe: Pipe;
    protected _outputPipe: Pipe;
    protected _errorPipe: Pipe;
    protected restartCount: number;
    protected spawnTime: number;
    protected explicitShutdown: boolean;
    protected stdoutCapture: Buffer[];
    protected stderrCapture: Buffer[];
    protected captureLimit: number;
    protected currentCaptureSize: {
        stdout: number;
        stderr: number;
    };
    protected lastExitCode: number | null;
    protected lastSignal: NodeJS.Signals | null;
    constructor(kernel: Kernel, hostess: Hostess, manifest: ExternalServerManifest);
    get inputPipe(): Pipe;
    get outputPipe(): Pipe;
    get errorPipe(): Pipe;
    spawn(): Promise<void>;
    restart(): Promise<void>;
    protected calculateBackoffDelay(): number;
    shutdown(timeout?: number): Promise<void>;
    isRunning(): boolean;
    getProcessInfo(): ProcessInfo;
    sendSignal(signal: NodeJS.Signals): void;
    protected registerWithHostess(): Promise<void>;
    protected deregisterFromHostess(): Promise<void>;
    protected handleExit(code: number | null, signal: NodeJS.Signals | null): void;
    protected getExitCodeInfo(code: number | null, signal: NodeJS.Signals | null): {
        type: string;
        message: string;
        level: 'info' | 'warn' | 'error';
    };
    protected shouldRestart(exitCode: number | null): boolean;
    protected captureOutput(chunk: Buffer, stream: 'stdout' | 'stderr'): void;
    protected clearCapture(): void;
    getCapturedStdout(): string;
    getCapturedStderr(): string;
    getRestartCount(): number;
    getLastExitCode(): number | null;
    getLastSignal(): NodeJS.Signals | null;
    getExitInfo(): string | null;
    protected runHealthCheck(): Promise<void>;
    protected runCommandHealthCheck(command: string, timeout: number): Promise<void>;
    protected runHttpHealthCheck(url: string, timeout: number): Promise<void>;
}
//# sourceMappingURL=ExternalServerWrapper.d.ts.map