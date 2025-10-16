# MKolbol Error Catalog

This document provides the canonical error codes, messages, and remediations for the mkolbol CLI.

## Error Format

### Text Format (Human-Readable)
```
[ERR] <CODE> [at <location>] — <message>
  [Expected: <values>]
  [Actual: <value>]
  Fix: <remediation>
  [Docs: <url>]
```

### JSON Format (Machine-Parseable)
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "remediation": "Actionable fix suggestion",
  "context": {
    "file": "path/to/file",
    "line": 12,
    "column": 7,
    "path": "$.topology.nodes[0]",
    "expected": ["value1", "value2"],
    "actual": "invalid-value",
    "details": {}
  },
  "docs": "https://mkolbol.dev/docs/..."
}
```

## Error Codes

### CONFIG_NOT_FOUND
**Message:** Configuration file not found  
**Remediation:** Run: mk init --preset tty  
**Docs:** https://mkolbol.dev/docs/config#locations

**Example (Text):**
```
[ERR] CONFIG_NOT_FOUND — Configuration file not found
  Fix: Run: mk init --preset tty
  Docs: https://mkolbol.dev/docs/config#locations
```

**Example (JSON):**
```json
{
  "code": "CONFIG_NOT_FOUND",
  "message": "Configuration file not found",
  "remediation": "Run: mk init --preset tty",
  "context": { "file": "mk.yaml" },
  "docs": "https://mkolbol.dev/docs/config#locations"
}
```

### CONFIG_INVALID
**Message:** Configuration file is invalid  
**Remediation:** Check the configuration file syntax  
**Docs:** https://mkolbol.dev/docs/config

### CONFIG_PARSE
**Message:** Failed to parse configuration file  
**Remediation:** Run: mk format --to json --dry-run  
**Docs:** https://mkolbol.dev/docs/config#yaml-indentation

**Example (Text):**
```
[ERR] CONFIG_PARSE at bad.yaml:12:7 — Failed to parse configuration file
  Fix: Run: mk format --to json --dry-run
  Docs: https://mkolbol.dev/docs/config#yaml-indentation
```

**Example (JSON):**
```json
{
  "code": "CONFIG_PARSE",
  "message": "Failed to parse configuration file",
  "remediation": "Run: mk format --to json --dry-run",
  "context": {
    "file": "bad.yaml",
    "line": 12,
    "column": 7
  },
  "docs": "https://mkolbol.dev/docs/config#yaml-indentation"
}
```

### MODULE_NOT_FOUND
**Message:** Required module not found  
**Remediation:** Run: npm install  
**Docs:** https://mkolbol.dev/docs/modules

### HEALTH_CHECK_FAILED
**Message:** Health check failed  
**Remediation:** Run: mk doctor --verbose  
**Docs:** https://mkolbol.dev/docs/troubleshooting#health-checks

### SCHEMA_INVALID
**Message:** Schema validation failed  
**Remediation:** Check the schema documentation for valid values  
**Docs:** https://mkolbol.dev/docs/schema

**Example (Text):**
```
[ERR] SCHEMA_INVALID at $.topology.nodes[0].runMode — Schema validation failed
  Expected: inproc, worker, process
  Fix: Check the schema documentation for valid values
  Docs: https://mkolbol.dev/docs/schema
```

**Example (JSON):**
```json
{
  "code": "SCHEMA_INVALID",
  "message": "Schema validation failed",
  "remediation": "Check the schema documentation for valid values",
  "context": {
    "path": "$.topology.nodes[0].runMode",
    "expected": ["inproc", "worker", "process"]
  },
  "docs": "https://mkolbol.dev/docs/schema"
}
```

### TOPOLOGY_INVALID
**Message:** Topology definition is invalid  
**Remediation:** Run: mk graph <topology-file> to validate  
**Docs:** https://mkolbol.dev/docs/topology

### RUNTIME_ERROR
**Message:** Runtime error occurred  
**Remediation:** Check logs for more details  
**Docs:** https://mkolbol.dev/docs/troubleshooting

### FILE_NOT_FOUND
**Message:** File not found  
**Remediation:** Verify the file path exists

### INVALID_ARGUMENT
**Message:** Invalid command line argument  
**Remediation:** Run: mk <command> --help

### UNKNOWN_COMMAND
**Message:** Unknown command  
**Remediation:** Run: mk --help

**Example (Text):**
```
[ERR] UNKNOWN_COMMAND — Unknown command: {"command":"nonexistent"}
  Fix: Run: mk --help
```

**Example (JSON):**
```json
{
  "code": "UNKNOWN_COMMAND",
  "message": "Unknown command: {\"command\":\"nonexistent\"}",
  "remediation": "Run: mk --help",
  "context": {
    "details": { "command": "nonexistent" }
  }
}
```

### PERMISSION_DENIED
**Message:** Permission denied  
**Remediation:** Check file permissions or run with appropriate privileges

### DEPENDENCY_ERROR
**Message:** Dependency error  
**Remediation:** Run: npm install  
**Docs:** https://mkolbol.dev/docs/installation

### NETWORK_ERROR
**Message:** Network error occurred  
**Remediation:** Check network connectivity and try again

### TIMEOUT
**Message:** Operation timed out  
**Remediation:** Increase timeout value or check system resources

## Usage

### In Code
```typescript
import { createError, formatError } from './src/mk/errors.js';

// Create an error
const error = createError('CONFIG_NOT_FOUND', { file: 'mk.yaml' });

// Format for output
console.error(formatError(error, 'text'));
// or
console.error(formatError(error, 'json'));
```

### CLI Flag
```bash
# Get JSON error output
mk run invalid-file.yaml --json
```

## Implementation

See:
- [src/mk/errors.ts](file:///srv/repos0/mkolbol/src/mk/errors.ts) - Error definitions and formatting
- [scripts/mk.ts](file:///srv/repos0/mkolbol/scripts/mk.ts) - CLI integration
- [tests/cli/mkdxErrors.spec.ts](file:///srv/repos0/mkolbol/tests/cli/mkdxErrors.spec.ts) - Error tests
