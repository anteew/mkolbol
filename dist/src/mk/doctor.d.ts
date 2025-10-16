export type CheckResult = {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    remediation?: string;
};
export declare function runDoctorChecks(verbose?: boolean): Promise<CheckResult[]>;
export declare function formatCheckResults(results: CheckResult[]): string;
//# sourceMappingURL=doctor.d.ts.map