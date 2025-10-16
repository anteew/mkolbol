export interface ErrorContext {
    [key: string]: unknown;
    file?: string;
    line?: number;
    column?: number;
    path?: string;
    expected?: string[];
    actual?: string;
    details?: Record<string, unknown>;
}
export interface MkErrorDefinition {
    code: string;
    message: string;
    remediation: string;
    docs?: string;
}
export declare class MkError extends Error {
    readonly code: string;
    readonly remediation: string;
    readonly context?: ErrorContext;
    readonly docs?: string;
    constructor(definition: MkErrorDefinition, context?: ErrorContext);
    toJSON(): {
        code: string;
        message: string;
        remediation: string;
        context: ErrorContext | undefined;
        docs: string | undefined;
    };
}
export declare const ERROR_CATALOG: {
    readonly CONFIG_NOT_FOUND: {
        readonly code: "CONFIG_NOT_FOUND";
        readonly message: "Configuration file not found";
        readonly remediation: "Run: mk init --preset tty";
        readonly docs: "https://mkolbol.dev/docs/config#locations";
    };
    readonly CONFIG_INVALID: {
        readonly code: "CONFIG_INVALID";
        readonly message: "Configuration file is invalid";
        readonly remediation: "Check the configuration file syntax";
        readonly docs: "https://mkolbol.dev/docs/config";
    };
    readonly CONFIG_PARSE: {
        readonly code: "CONFIG_PARSE";
        readonly message: "Failed to parse configuration file";
        readonly remediation: "Run: mk format --to json --dry-run";
        readonly docs: "https://mkolbol.dev/docs/config#yaml-indentation";
    };
    readonly MODULE_NOT_FOUND: {
        readonly code: "MODULE_NOT_FOUND";
        readonly message: "Required module not found";
        readonly remediation: "Run: npm install";
        readonly docs: "https://mkolbol.dev/docs/modules";
    };
    readonly HEALTH_CHECK_FAILED: {
        readonly code: "HEALTH_CHECK_FAILED";
        readonly message: "Health check failed";
        readonly remediation: "Run: mk doctor --verbose";
        readonly docs: "https://mkolbol.dev/docs/troubleshooting#health-checks";
    };
    readonly SCHEMA_INVALID: {
        readonly code: "SCHEMA_INVALID";
        readonly message: "Schema validation failed";
        readonly remediation: "Check the schema documentation for valid values";
        readonly docs: "https://mkolbol.dev/docs/schema";
    };
    readonly TOPOLOGY_INVALID: {
        readonly code: "TOPOLOGY_INVALID";
        readonly message: "Topology definition is invalid";
        readonly remediation: "Run: mk graph <topology-file> to validate";
        readonly docs: "https://mkolbol.dev/docs/topology";
    };
    readonly RUNTIME_ERROR: {
        readonly code: "RUNTIME_ERROR";
        readonly message: "Runtime error occurred";
        readonly remediation: "Check logs for more details";
        readonly docs: "https://mkolbol.dev/docs/troubleshooting";
    };
    readonly FILE_NOT_FOUND: {
        readonly code: "FILE_NOT_FOUND";
        readonly message: "File not found";
        readonly remediation: "Verify the file path exists";
    };
    readonly INVALID_ARGUMENT: {
        readonly code: "INVALID_ARGUMENT";
        readonly message: "Invalid command line argument";
        readonly remediation: "Run: mk <command> --help";
    };
    readonly UNKNOWN_COMMAND: {
        readonly code: "UNKNOWN_COMMAND";
        readonly message: "Unknown command";
        readonly remediation: "Run: mk --help";
    };
    readonly PERMISSION_DENIED: {
        readonly code: "PERMISSION_DENIED";
        readonly message: "Permission denied";
        readonly remediation: "Check file permissions or run with appropriate privileges";
    };
    readonly DEPENDENCY_ERROR: {
        readonly code: "DEPENDENCY_ERROR";
        readonly message: "Dependency error";
        readonly remediation: "Run: npm install";
        readonly docs: "https://mkolbol.dev/docs/installation";
    };
    readonly NETWORK_ERROR: {
        readonly code: "NETWORK_ERROR";
        readonly message: "Network error occurred";
        readonly remediation: "Check network connectivity and try again";
    };
    readonly TIMEOUT: {
        readonly code: "TIMEOUT";
        readonly message: "Operation timed out";
        readonly remediation: "Increase timeout value or check system resources";
    };
};
export type ErrorCode = keyof typeof ERROR_CATALOG;
export declare function createError(code: ErrorCode, context?: ErrorContext): MkError;
export type ErrorFormat = 'text' | 'json';
export declare function formatError(error: MkError | Error, format?: ErrorFormat): string;
export declare function isJsonOutputRequested(args: string[]): boolean;
export declare const EXIT_CODES: {
    readonly SUCCESS: 0;
    readonly ERROR: 1;
    readonly USAGE: 64;
    readonly CONFIG_INVALID: 65;
    readonly CONFIG_NOT_FOUND: 66;
    readonly VALIDATION_ERROR: 65;
};
//# sourceMappingURL=errors.d.ts.map