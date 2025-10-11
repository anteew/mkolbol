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
    constructor(kernel: Kernel, hostess: Hostess, manifest: ExternalServerManifest);
    get inputPipe(): Pipe;
    get outputPipe(): Pipe;
    get errorPipe(): Pipe;
    spawn(): Promise<void>;
    restart(): Promise<void>;
    shutdown(timeout?: number): Promise<void>;
    isRunning(): boolean;
    getProcessInfo(): ProcessInfo;
    sendSignal(signal: NodeJS.Signals): void;
    protected registerWithHostess(): Promise<void>;
    protected deregisterFromHostess(): Promise<void>;
    protected handleExit(code: number | null, signal: NodeJS.Signals | null): void;
    protected shouldRestart(exitCode: number | null): boolean;
}
//# sourceMappingURL=ExternalServerWrapper.d.ts.map