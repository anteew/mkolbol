export type CheckResult = {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    remediation?: string;
};
export type CheckSection = 'all' | 'toolchain' | 'environment';
export declare function runDoctorChecks(verbose?: boolean, section?: CheckSection): Promise<CheckResult[]>;
export declare function formatCheckResults(results: CheckResult[], format?: 'text' | 'json'): string;
//# sourceMappingURL=doctor.d.ts.map