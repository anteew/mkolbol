import { ExternalServerWrapper } from './ExternalServerWrapper.js';
import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import type { ExternalServerManifest } from '../types.js';
export declare class PTYServerWrapper extends ExternalServerWrapper {
    private ptyProcess?;
    private terminalSize;
    private dataDisposable?;
    constructor(kernel: Kernel, hostess: Hostess, manifest: ExternalServerManifest);
    spawn(): Promise<void>;
    resize(cols: number, rows: number): void;
    shutdown(timeout?: number): Promise<void>;
    sendSignal(signal: string): void;
    isRunning(): boolean;
    getProcessInfo(): {
        pid: number;
        uptime: number;
        memoryUsage: number;
        cpuUsage: number;
    };
    restart(): Promise<void>;
}
//# sourceMappingURL=PTYServerWrapper.d.ts.map