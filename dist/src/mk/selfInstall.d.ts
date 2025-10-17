export type InstallOptions = {
    binDir: string;
    from: 'repo' | 'global';
    copy?: boolean;
    verbose?: boolean;
};
export type InstallResult = {
    success: boolean;
    message: string;
    shimPaths?: string[];
};
export declare function install(options: InstallOptions): InstallResult;
export declare function uninstall(binDir: string): InstallResult;
export declare function where(): InstallResult;
export declare function switchVersion(version: string): InstallResult;
//# sourceMappingURL=selfInstall.d.ts.map