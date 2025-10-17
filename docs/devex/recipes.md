# mkolbol Recipes — Curated Topology Patterns

Recipes are pre-built topology patterns for common use cases. Use `mk recipes` to discover and generate them.

## Commands

```bash
# List all available recipes
mk recipes
mk recipes --list

# Show full configuration for a recipe
mk recipes --show tee-filesink
mk recipes --show http-logs-jsonl
```

## Available Recipes

### tee-filesink

**Description**: Duplicate output to console and file simultaneously  
**Use Case**: Log to file while monitoring console output  
**Tags**: logging, monitoring, fan-out

**Pattern**: Timer → Tee → [Console, FileSink]

**When to use**:

- Need both live console output and persistent logs
- Debugging while capturing full session
- Multi-destination output

---

### rate-limit

**Description**: Throttle message flow with token bucket rate limiting  
**Use Case**: Prevent overwhelming downstream systems  
**Tags**: rate-limiting, backpressure, throttling

**Pattern**: Source → RateLimiter → Sink

**When to use**:

- API rate limiting
- Resource protection
- Burst smoothing
- Fair queuing

**Configuration options**:

- `capacity`: Token bucket size
- `refillRate`: Tokens per interval
- `refillInterval`: Refill frequency (ms)

---

### http-logs-jsonl

**Description**: Fetch HTTP responses and log as JSONL with metrics  
**Use Case**: API monitoring and structured logging  
**Tags**: http, logging, metrics, jsonl

**Pattern**: ExternalProcess (curl) → PipeMeter → FileSink (JSONL)

**When to use**:

- HTTP endpoint monitoring
- API response logging
- Structured log analysis
- Throughput measurement

**Features**:

- JSONL format for easy parsing (jq, logq)
- Throughput metrics (bytes/sec, msg/sec)
- Timestamped entries

---

### transform-chain

**Description**: Chain multiple transforms for data processing pipeline  
**Use Case**: Multi-stage data transformation  
**Tags**: pipeline, transform, processing

**Pattern**: Source → Transform1 → Transform2 → ... → Sink

**When to use**:

- Multi-step processing
- Data enrichment pipelines
- Format conversions
- Filtering and routing

**Example transforms**:

- UppercaseTransform
- PipeMeterTransform (metrics)
- RateLimiterTransform (throttling)
- TeeTransform (fan-out)

---

### health-check

**Description**: External process with startup health verification  
**Use Case**: Ensure service is healthy before routing traffic  
**Tags**: health-check, external-process, reliability

**Pattern**: ExternalProcess (with healthCheck) → Sink

**When to use**:

- Running external services (HTTP servers, daemons)
- Need startup verification
- Circuit breaker patterns
- Graceful degradation

**Health check types**:

- **HTTP**: GET request, expect 2xx status
- **Command**: Shell command, expect exit 0

**Configuration**:

```yaml
healthCheck:
  type: http
  url: http://localhost:3000/health
  timeout: 5000
  retries: 3
```

---

## Creating Custom Recipes

To create your own recipe:

1. Start with an existing recipe as template:

   ```bash
   mk recipes --show tee-filesink > my-topology.yml
   ```

2. Modify for your use case

3. Test with `mk run`:

   ```bash
   mk run my-topology.yml --dry-run   # Validate
   mk run my-topology.yml              # Execute
   ```

4. Share with team or contribute to recipe catalog

## Recipe Best Practices

**Naming**: Use descriptive kebab-case names (http-to-file, rate-limited-api)

**Documentation**: Include clear description, use case, and tags

**Modularity**: Keep recipes focused on one pattern

**Composability**: Recipes should be easy to combine

**Testing**: Verify recipes work across different environments

## See Also

- [mkctl Cookbook](./mkctl-cookbook.md) - CLI usage patterns
- [Quickstart Guide](./quickstart.md) - Getting started
- [Example Configs](../../examples/configs/) - More examples
