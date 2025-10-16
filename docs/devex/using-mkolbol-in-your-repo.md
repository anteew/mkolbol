# Using mkolbol in Your Repository

This guide shows you how to integrate mkolbol into your project for stream processing, data pipelines, and observability.

## Quick Start: 5-Minute Setup

### 1. Install mkolbol

```bash
npm install mkolbol
# or use local development
npm link ../mkolbol
```

### 2. Create a topology file

```yaml
# topology.yml
nodes:
  - id: timer
    module: TimerSource
    params: { periodMs: 1000 }

  - id: uppercase
    module: UppercaseTransform

  - id: console
    module: ConsoleSink
    params: { prefix: "[output]" }

connections:
  - from: timer.output
    to: uppercase.input
  - from: uppercase.output
    to: console.input
```

### 3. Run the topology

```bash
# Run for 10 seconds
npx mkctl run --file topology.yml --duration 10

# Or validate without running
npx mkctl run --file topology.yml --dry-run
```

**Expected output:**
```
[output] TICK
[output] TICK
```

## Common Use Cases

### Use Case 1: HTTP Logging Pipeline

Capture HTTP requests and log them:

```yaml
nodes:
  - id: http-server
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - |
          require('http').createServer((req, res) => {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
            res.end('OK');
          }).listen(3000)
      ioMode: stdio
      healthCheck:
        type: http
        url: http://localhost:3000
        retries: 3

  - id: logger
    module: FilesystemSink
    params:
      path: logs/http-access.log
      format: jsonl

connections:
  - from: http-server.output
    to: logger.input
```

**Usage:**
```bash
# Run for 60 seconds
npx mkctl run --file http-logging.yml --duration 60

# In another terminal, send requests
for i in {1..5}; do
  curl http://localhost:3000/test
done

# View logs
cat logs/http-access.log | jq '.data'
```

### Use Case 2: Data Pipeline with Metrics

Monitor throughput while processing data:

```yaml
nodes:
  - id: source
    module: TimerSource
    params: { periodMs: 100 }

  - id: meter
    module: PipeMeterTransform
    params: { emitInterval: 1000 }

  - id: transform
    module: UppercaseTransform

  - id: output
    module: ConsoleSink

connections:
  - from: source.output
    to: meter.input
  - from: meter.output
    to: transform.input
  - from: transform.output
    to: output.input
```

### Use Case 3: Splitting to Multiple Destinations

Use Tee to send data to multiple sinks:

```yaml
nodes:
  - id: source
    module: TimerSource

  - id: splitter
    module: TeeTransform

  - id: console-sink
    module: ConsoleSink
    params: { prefix: "[console]" }

  - id: file-sink
    module: FilesystemSink
    params: { path: output.log }

connections:
  - from: source.output
    to: splitter.input
  - from: splitter.output
    to: console-sink.input
  - from: splitter.output
    to: file-sink.input
```

## Programmatic Usage

### Creating a Topology in Code

```typescript
import {
  Kernel,
  Hostess,
  StateManager,
  Executor,
  RoutingServer
} from 'mkolbol';

async function runTopology() {
  // Create core components
  const kernel = new Kernel();
  const hostess = new Hostess();
  const stateManager = new StateManager(kernel);
  const executor = new Executor(kernel, hostess, stateManager);
  const router = new RoutingServer();

  executor.setRoutingServer(router);

  // Load and run configuration
  const config = {
    nodes: [
      {
        id: 'timer',
        module: 'TimerSource',
        params: { periodMs: 1000 }
      },
      {
        id: 'console',
        module: 'ConsoleSink',
        params: { prefix: '[log]' }
      }
    ],
    connections: [
      { from: 'timer.output', to: 'console.input' }
    ]
  };

  try {
    await executor.load(config);
    await executor.up();

    // Run for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));

    await executor.down();
  } catch (err) {
    console.error('Topology error:', err);
  }
}

runTopology();
```

### Building a Custom Module

```typescript
// my-module.ts
import { Kernel } from 'mkolbol';

export class MyCustomModule {
  inputPipe?: NodeJS.ReadableStream;
  outputPipe?: NodeJS.WritableStream;

  constructor(private kernel: Kernel, private options: any = {}) {}

  start(): void {
    this.inputPipe?.on('data', (chunk: Buffer) => {
      const processed = chunk.toString().toUpperCase();
      this.outputPipe?.write(processed);
    });
  }

  stop(): void {
    // Cleanup
  }
}
```

Register it:

```typescript
executor.registerModule('MyCustomModule', MyCustomModule);
```

## Best Practices

### 1. Configuration Management

**Do's:**
- ✅ Use environment variables for paths and ports
- ✅ Validate configs with `--dry-run` before deployment
- ✅ Version control your topology files
- ✅ Use absolute paths for external processes

**Don'ts:**
- ❌ Hardcode ports or file paths
- ❌ Use relative paths for external commands
- ❌ Mix logic and configuration

**Example:**
```yaml
# ❌ Bad
nodes:
  - id: server
    module: ExternalProcess
    params:
      command: node server.js
      healthCheck:
        url: http://localhost:3000

# ✅ Good
nodes:
  - id: server
    module: ExternalProcess
    params:
      command: /usr/bin/node
      args: ["${SERVER_PATH}"]
      healthCheck:
        type: http
        url: "http://localhost:${SERVER_PORT}"
```

### 2. Error Handling

Always provide helpful error context:

```yaml
nodes:
  - id: external-service
    module: ExternalProcess
    params:
      command: /path/to/service
      healthCheck:
        type: http
        url: http://localhost:8080/health
        timeout: 5000
        retries: 3
      restart: on-failure
      maxRestarts: 5
```

### 3. Monitoring and Debugging

Use metrics and logging:

```bash
# Validate config
npx mkctl run --file config.yml --dry-run

# Check endpoints
npx mkctl endpoints --json | jq '.[] | {id, type}'

# Monitor live
npx mkctl endpoints --watch

# View logs
npx mkctl run --file config.yml --duration 30 > /tmp/run.log 2>&1
cat /tmp/run.log | grep -i error
```

## Integration Patterns

### Pattern 1: CI/CD Pipeline

```bash
# .github/workflows/process-data.yml
- name: Run data pipeline
  run: |
    npx mkctl run --file config/pipeline.yml --duration 60
    if [ -f output.log ]; then
      echo "Pipeline completed successfully"
    else
      echo "Pipeline failed" && exit 1
    fi
```

### Pattern 2: Development Workflow

```json
{
  "scripts": {
    "topology:validate": "mkctl run --file topology.yml --dry-run",
    "topology:dev": "mkctl run --file topology.yml --duration 30",
    "topology:test": "MK_LOCAL_NODE=1 mkctl run --file test-topology.yml --duration 5"
  }
}
```

### Pattern 3: Docker Deployment

```dockerfile
FROM node:24-alpine

WORKDIR /app
COPY . .
RUN npm ci

EXPOSE 3000
CMD ["npx", "mkctl", "run", "--file", "/config/topology.yml"]
```

```bash
# docker-compose.yml
services:
  processor:
    build: .
    volumes:
      - ./topology.yml:/config/topology.yml
      - ./logs:/app/logs
    ports:
      - "3000:3000"
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Config file not found" | Use absolute path: `mkctl run --file $(pwd)/topology.yml` |
| "Command not found" | Use full path: `/usr/bin/node` instead of `node` |
| "Health check failed" | Verify service is running: `curl http://localhost:3000/health` |
| "Port already in use" | Find/kill process: `lsof -i :3000 && kill -9 <pid>` |
| "Permission denied" | Fix file permissions: `chmod 755 logs/` |

### Getting Help

- **Troubleshooting**: See [Doctor Guide](./doctor.md)
- **Examples**: Check `examples/configs/` in the repo
- **Tutorials**: Start with [Hello Calculator](./hello-calculator.md)
- **Reference**: See [mkctl Cookbook](./mkctl-cookbook.md)

## Next Steps

- 📚 Read [Hello Calculator Tutorial](./hello-calculator.md) for hands-on learning
- 👨‍💻 Build a custom module: [Authoring a Module](./authoring-a-module.md)
- 🔧 Explore [mkctl Cookbook](./mkctl-cookbook.md) for daily commands
- 🆘 Use [Doctor Guide](./doctor.md) for troubleshooting

