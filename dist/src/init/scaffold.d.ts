export interface ScaffoldOptions {
    template?: 'node-defaults' | 'go-defaults' | 'minimal';
    dryRun?: boolean;
    force?: boolean;
    silent?: boolean;
}
interface ScaffoldResult {
    success: boolean;
    configPath: string;
    configContent: string;
    gitignoreUpdated: boolean;
    message: string;
}
export declare function scaffold(options?: ScaffoldOptions): ScaffoldResult;
export declare function printScaffoldPreview(result: ScaffoldResult): void;
export {};
//# sourceMappingURL=scaffold.d.ts.map