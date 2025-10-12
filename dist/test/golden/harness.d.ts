export interface MaskRule {
    pattern: RegExp;
    replacement: string;
}
export interface GoldenOptions {
    suite: string;
    case: string;
    masks?: MaskRule[];
}
export declare class GoldenHarness {
    private options;
    private masks;
    constructor(options: GoldenOptions);
    private applyMasks;
    private getSnapshotPath;
    snapshot(content: string): void;
    compare(content: string): {
        match: boolean;
        expected?: string;
        actual?: string;
    };
    assertSnapshot(content: string): void;
}
export declare function createGoldenHarness(options: GoldenOptions): GoldenHarness;
//# sourceMappingURL=harness.d.ts.map