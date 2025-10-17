export interface BootstrapOptions {
    yes?: boolean;
    verbose?: boolean;
    template?: string;
    source?: 'tarball' | 'git' | 'local';
    gitTag?: string;
    tarballPath?: string;
}
interface TemplateManifest {
    name: string;
    description: string;
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
}
export declare function bootstrapProject(appDir: string, options?: BootstrapOptions): Promise<void>;
export declare function listTemplates(): Promise<TemplateManifest[]>;
export {};
//# sourceMappingURL=bootstrap.d.ts.map