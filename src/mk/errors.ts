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

export class MkError extends Error {
  public readonly code: string;
  public readonly remediation: string;
  public readonly context?: ErrorContext;
  public readonly docs?: string;

  constructor(definition: MkErrorDefinition, context?: ErrorContext) {
    const fullMessage = context?.details 
      ? `${definition.message}: ${JSON.stringify(context.details)}`
      : definition.message;
    super(fullMessage);
    this.name = 'MkError';
    this.code = definition.code;
    this.remediation = definition.remediation;
    this.context = context;
    this.docs = definition.docs;
    Error.captureStackTrace(this, MkError);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      remediation: this.remediation,
      context: this.context,
      docs: this.docs,
    };
  }
}

export const ERROR_CATALOG = {
  CONFIG_NOT_FOUND: {
    code: 'CONFIG_NOT_FOUND',
    message: 'Configuration file not found',
    remediation: 'Run: mk init --preset tty',
    docs: 'https://mkolbol.dev/docs/config#locations',
  },
  CONFIG_INVALID: {
    code: 'CONFIG_INVALID',
    message: 'Configuration file is invalid',
    remediation: 'Check the configuration file syntax',
    docs: 'https://mkolbol.dev/docs/config',
  },
  CONFIG_PARSE: {
    code: 'CONFIG_PARSE',
    message: 'Failed to parse configuration file',
    remediation: 'Run: mk format --to json --dry-run',
    docs: 'https://mkolbol.dev/docs/config#yaml-indentation',
  },
  MODULE_NOT_FOUND: {
    code: 'MODULE_NOT_FOUND',
    message: 'Required module not found',
    remediation: 'Run: npm install',
    docs: 'https://mkolbol.dev/docs/modules',
  },
  HEALTH_CHECK_FAILED: {
    code: 'HEALTH_CHECK_FAILED',
    message: 'Health check failed',
    remediation: 'Run: mk doctor --verbose',
    docs: 'https://mkolbol.dev/docs/troubleshooting#health-checks',
  },
  SCHEMA_INVALID: {
    code: 'SCHEMA_INVALID',
    message: 'Schema validation failed',
    remediation: 'Check the schema documentation for valid values',
    docs: 'https://mkolbol.dev/docs/schema',
  },
  TOPOLOGY_INVALID: {
    code: 'TOPOLOGY_INVALID',
    message: 'Topology definition is invalid',
    remediation: 'Run: mk graph <topology-file> to validate',
    docs: 'https://mkolbol.dev/docs/topology',
  },
  RUNTIME_ERROR: {
    code: 'RUNTIME_ERROR',
    message: 'Runtime error occurred',
    remediation: 'Check logs for more details',
    docs: 'https://mkolbol.dev/docs/troubleshooting',
  },
  FILE_NOT_FOUND: {
    code: 'FILE_NOT_FOUND',
    message: 'File not found',
    remediation: 'Verify the file path exists',
  },
  INVALID_ARGUMENT: {
    code: 'INVALID_ARGUMENT',
    message: 'Invalid command line argument',
    remediation: 'Run: mk <command> --help',
  },
  UNKNOWN_COMMAND: {
    code: 'UNKNOWN_COMMAND',
    message: 'Unknown command',
    remediation: 'Run: mk --help',
  },
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    message: 'Permission denied',
    remediation: 'Check file permissions or run with appropriate privileges',
  },
  DEPENDENCY_ERROR: {
    code: 'DEPENDENCY_ERROR',
    message: 'Dependency error',
    remediation: 'Run: npm install',
    docs: 'https://mkolbol.dev/docs/installation',
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error occurred',
    remediation: 'Check network connectivity and try again',
  },
  TIMEOUT: {
    code: 'TIMEOUT',
    message: 'Operation timed out',
    remediation: 'Increase timeout value or check system resources',
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function createError(code: ErrorCode, context?: ErrorContext): MkError {
  return new MkError(ERROR_CATALOG[code], context);
}

export type ErrorFormat = 'text' | 'json';

export function formatError(error: MkError | Error, format: ErrorFormat = 'text'): string {
  if (format === 'json') {
    if (error instanceof MkError) {
      return JSON.stringify(error.toJSON(), null, 2);
    }
    return JSON.stringify({
      code: 'UNKNOWN_ERROR',
      message: error.message,
      remediation: 'Check logs for more details',
    }, null, 2);
  }

  if (error instanceof MkError) {
    const parts = [`[ERR] ${error.code}`];
    
    if (error.context?.file) {
      const location = [error.context.file];
      if (error.context.line) location.push(String(error.context.line));
      if (error.context.column) location.push(String(error.context.column));
      parts.push(`at ${location.join(':')}`);
    }
    
    if (error.context?.path) {
      parts.push(`at ${error.context.path}`);
    }
    
    parts.push(`— ${error.message}`);
    
    let output = parts.join(' ');
    
    if (error.context?.expected) {
      output += `\n  Expected: ${error.context.expected.join(', ')}`;
    }
    
    if (error.context?.actual) {
      output += `\n  Actual: ${error.context.actual}`;
    }
    
    output += `\n  Fix: ${error.remediation}`;
    
    if (error.docs) {
      output += `\n  Docs: ${error.docs}`;
    }
    
    return output;
  }

  return `Error: ${error.message}`;
}

export function isJsonOutputRequested(args: string[]): boolean {
  return args.includes('--json');
}

export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  USAGE: 64,
  CONFIG_INVALID: 65,
  CONFIG_NOT_FOUND: 66,
  VALIDATION_ERROR: 65,
} as const;
