export interface FetchOptions {
    verify?: boolean;
    forceDownload?: boolean;
}
export declare function downloadRelease(tag: string, options?: FetchOptions): Promise<string>;
export declare function verifyTarball(tarballPath: string, hashPath: string): Promise<boolean>;
export declare function calculateSHA256(filePath: string): Promise<string>;
export declare function installTarball(tarballPath: string): Promise<void>;
//# sourceMappingURL=fetch.d.ts.map