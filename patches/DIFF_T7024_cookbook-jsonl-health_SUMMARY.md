# T7024: mkctl Cookbook Documentation Update

## Summary

Updated [docs/devex/mkctl-cookbook.md](file:///srv/repos0/mkolbol/docs/devex/mkctl-cookbook.md) with comprehensive examples for dry-run validation, health checks, JSONL format output, and PipeMeter usage patterns.

## Sections Added

### 1. Dry-Run Validation (§ Running Topologies)
- **Location**: After "Basic: Run a topology" section
- **New subsection**: "Validate topology without running (dry-run)"
- **Content**:
  - Usage examples with `--dry-run` flag
  - Output examples (valid/invalid configs)
  - Use cases (CI/CD, pre-deployment checks)
  - Multiple practical examples
  - Exit code reference (0, 65, 66)

**Key features documented:**
```bash
mkctl run --file config.yml --dry-run
```
- Validates without instantiating modules
- Works in CI/CD pipelines
- Flag position-independent
- Batch config validation

### 2. FilesystemSink Output Formats (New § before Troubleshooting)
- **Location**: New major section after PipeMeter Transform
- **Section**: "## FilesystemSink Output Formats"
- **Subsections**:
  - Raw Format (Default)
  - JSONL Format (Timestamped JSON Lines)
  - Raw Format with Timestamps
  - Configuration Options (table)
  - Practical Example: HTTP Logs to JSONL
  - Processing JSONL with jq

**Key features documented:**
```yaml
format: jsonl  # Wraps data as {"ts": "...", "data": "..."}
```
- Three output formats (raw, jsonl, raw+timestamp)
- Complete config option reference
- Real-world HTTP logging example
- jq processing patterns

**Use cases:**
- Log aggregation (Elasticsearch, Splunk)
- Stream processing (Kafka, Kinesis)
- Data analysis with jq/Python
- Audit trails with timestamps

### 3. Health Checks (Already documented)
- Health check examples were already present in the cookbook (lines 213-275)
- No changes needed - comprehensive documentation already exists
- Includes command-based and HTTP-based health checks
- Full configuration table provided

### 4. PipeMeter Usage (Already documented)
- PipeMeter transform already documented (lines 283-395)
- No changes needed - comprehensive documentation already exists
- Includes basic usage, options, metrics, use cases
- Multiple pipeline examples provided
- Programmatic access examples included

## Files Changed

- [docs/devex/mkctl-cookbook.md](file:///srv/repos0/mkolbol/docs/devex/mkctl-cookbook.md) - Main update

## Related Updates

- [docs/devex/quickstart.md](file:///srv/repos0/mkolbol/docs/devex/quickstart.md) - Enhanced FilesystemSink section with PipeMeter integration example

## Build Verification

```bash
npm run build  # ✓ Success
```

## Line Count

- **Patch size**: 233 lines
- **Added documentation**: ~215 new lines of content
- **Sections**: 2 new major sections, 8 subsections

## Cross-References

This documentation complements:
- T7003: mkctl dry-run implementation
- T7004: FilesystemSink JSONL format
- T7006: PipeMeter transform
- T6003: External process health checks
