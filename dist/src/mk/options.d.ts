export interface MkOptions {
    profile?: string;
    [key: string]: any;
}
export interface MkOptionsFile {
    default?: Record<string, any>;
    [profile: string]: Record<string, any> | undefined;
}
export interface LoadOptionsConfig {
    cwd?: string;
    profile?: string;
    cliArgs?: string[];
}
export declare function loadOptions(config?: LoadOptionsConfig): MkOptions;
export declare function getOptionsPrecedence(config?: LoadOptionsConfig): string[];
//# sourceMappingURL=options.d.ts.map