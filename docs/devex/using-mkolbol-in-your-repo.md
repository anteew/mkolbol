# Bootstrap an Out-of-Tree mkolbol App

**Create production-ready mkolbol projects outside the mkolbol repository using `mk init`.**

This guide shows you how to bootstrap mkolbol applications in your own repository using the `mk` CLI, no manual file copying required.

---

## Overview

**What is bootstrapping?**

- Create a new mkolbol project from a template
- Generate project structure, configs, and starter code
- Install mkolbol as a dependency (tarball, git tag, or vendor)
- Get a runnable topology in under 5 minutes

**What you'll create:**

- A complete hello-calculator app (3-node topology)
- All project files (package.json, tsconfig.json, src/, .mk/)
- Ready to run, test, and customize

---

## Prerequisites

**Before bootstrapping, you need mkolbol available:**

1. **Clone and build mkolbol** (one-time setup):

   ```bash
   git clone https://github.com/anteew/mkolbol.git
   cd mkolbol
   npm install
   npm run build
   export MK_LOCAL_NODE=1
   ```

2. **(Optional) Add mk to PATH:**
   See [Installation: mk Anywhere](../../README.md#installation-mk-anywhere-self-install) to avoid using `node dist/scripts/mk.js` every time.

---

## Quick Start: Bootstrap Hello Calculator (5 Minutes)

### Step 1: Create Project Directory

```bash
# Create a workspace for your out-of-tree app
mkdir ~/my-mkolbol-projects
cd ~/my-mkolbol-projects
```

### Step 2: Bootstrap with mk init

```bash
# Run mk init from the mkolbol repo
node /path/to/mkolbol/dist/scripts/mk.js init hello-calculator --lang ts --preset tty

# Or if mk is in PATH:
mk init hello-calculator --lang ts --preset tty
```

**What happens:**

1. Creates `hello-calculator/` directory
2. Generates project structure (src/, .mk/, package.json, tsconfig.json)
3. Scaffolds 3-node topology (CalculatorServer → XtermTTYRenderer → FilesystemSink)
4. Adds README.md and .gitignore

**Output:**

```
✓ Created hello-calculator/
✓ Initialized package.json
✓ Created tsconfig.json
✓ Scaffolded src/index.ts with CalculatorServer
✓ Generated mk.json topology (3 nodes, 2 connections)
✓ Created .mk/options.json with dev/ci/release profiles
✓ Generated README.md and .gitignore

Next steps:
  cd hello-calculator
  npm install ../mkolbol/mkolbol-0.2.0.tgz  # Install mkolbol dependency
  npm run build
  mk run --file mk.json --duration 10
```

### Step 3: Install mkolbol Dependency

Choose your distribution method (see [Distribution Matrix](./distribution.md) for details):

**Option 1: Tarball (Recommended)**

```bash
cd hello-calculator

# Pack mkolbol from the repo
cd /path/to/mkolbol
npm pack  # Creates mkolbol-0.2.0.tgz

# Install in your project
cd ~/my-mkolbol-projects/hello-calculator
npm install /path/to/mkolbol/mkolbol-0.2.0.tgz
```

**Option 2: Git Tag**

```bash
cd hello-calculator
npm install github:anteew/mkolbol#v0.2.0
```

**Option 3: Vendor (Monorepo)**

```bash
# Copy mkolbol into your monorepo
cp -r /path/to/mkolbol ~/my-monorepo/packages/mkolbol

# Reference from hello-calculator/package.json
cd hello-calculator
npm install file:../packages/mkolbol
```

### Step 4: Build and Run

```bash
# Build TypeScript
npm run build

# Run the topology
mk run --file mk.json --duration 10

# In another terminal, test the calculator
curl 'http://localhost:4000/add?a=5&b=3'       # → {"result":8}
curl 'http://localhost:4000/subtract?a=10&b=7' # → {"result":3}
```

**Expected output:**

```
[mk] Running in Local Node mode (MK_LOCAL_NODE=1): network features disabled.
[mk] Loading config from: mk.json
[mk] Bringing topology up...
[calculator] Server listening on http://localhost:4000
[calculator] GET /add?a=5&b=3 → 8.00
[calculator] GET /subtract?a=10&b=7 → 3.00
```

🎉 **Success!** You've bootstrapped your first out-of-tree mkolbol app.

---

## Project Structure

After `mk init`, you'll have:

```
hello-calculator/
├── .mk/
│   └── options.json       # dev/ci/release profiles
├── src/
│   └── index.ts           # CalculatorServer module
├── mk.json                # Topology configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript config
├── .gitignore             # Git ignore patterns
└── README.md              # Project documentation
```

### Key Files Explained

#### mk.json (Topology Config)

```json
{
  "topology": {
    "nodes": [
      {
        "id": "calculator",
        "module": "CalculatorServer",
        "runMode": "inproc",
        "params": { "port": 4000, "precision": 2 }
      },
      {
        "id": "tty-renderer",
        "module": "XtermTTYRenderer",
        "runMode": "inproc"
      },
      {
        "id": "logger",
        "module": "FilesystemSink",
        "runMode": "inproc",
        "params": {
          "path": "logs/calculator.jsonl",
          "format": "jsonl"
        }
      }
    ],
    "connections": [
      { "from": "calculator.output", "to": "tty-renderer.input" },
      { "from": "calculator.output", "to": "logger.input" }
    ]
  }
}
```

#### .mk/options.json (Profiles)

```json
{
  "profiles": {
    "dev": {
      "watch": true,
      "reload": "hot",
      "logLevel": "debug",
      "gates": { "MK_LOCAL_NODE": "1" }
    },
    "ci": {
      "watch": false,
      "testMatrix": {
        "node": ["20", "24"],
        "lane": ["threads", "forks"]
      }
    }
  }
}
```

#### src/index.ts (CalculatorServer Module)

```typescript
import { Kernel } from 'mkolbol';
import * as http from 'http';

export class CalculatorServer {
  private server: http.Server | null = null;

  constructor(
    private kernel: Kernel,
    private options: { port: number; precision: number },
  ) {}

  start() {
    const { port, precision } = this.options;
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${port}`);

      if (url.pathname === '/add') {
        const a = parseFloat(url.searchParams.get('a') || '0');
        const b = parseFloat(url.searchParams.get('b') || '0');
        const result = (a + b).toFixed(precision);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: parseFloat(result) }));
      }
      // ... more endpoints
    });
    this.server.listen(port);
  }

  stop() {
    if (this.server) this.server.close();
  }
}
```

---

## Installation Methods (Distribution Paths)

> **Note:** mkolbol is not published to npm. Choose one of these methods:

| Method      | Use Case                 | Pros                                           | Cons                       |
| ----------- | ------------------------ | ---------------------------------------------- | -------------------------- |
| **Tarball** | Production, CI/CD        | Reproducible, version-pinned, offline installs | Manual tarball management  |
| **Git Tag** | Development, testing     | Easy version switching                         | Requires git access        |
| **Vendor**  | Monorepo, offline builds | Full control, no external deps                 | Repo bloat, manual updates |

### Tarball Installation (Detailed)

```bash
# 1. Pack mkolbol from repo
cd /path/to/mkolbol
npm run build
npm pack  # → mkolbol-0.2.0.tgz

# 2. Install in your project
cd /your/project
npm install /path/to/mkolbol/mkolbol-0.2.0.tgz

# 3. Verify
npm list mkolbol
# → mkolbol@0.2.0
```

### Git Tag Installation (Detailed)

```bash
# Install specific version
npm install github:anteew/mkolbol#v0.2.0

# Install main branch (latest)
npm install github:anteew/mkolbol#main

# Verify
npm list mkolbol
```

### Vendor Installation (Detailed)

```bash
# Copy mkolbol into your repo
mkdir -p vendor
cp -r /path/to/mkolbol vendor/mkolbol

# Update package.json
{
  "dependencies": {
    "mkolbol": "file:./vendor/mkolbol"
  }
}

# Install
npm install
```

For complete comparison, see **[Distribution Matrix](./distribution.md)**.

---

## Customizing Your Bootstrapped Project

After bootstrapping with `mk init`, customize the generated files:

### Customize Topology (mk.json)

**Change ports:**

```json
{
  "params": { "port": 5000, "precision": 3 }
}
```

**Add more nodes:**

```json
{
  "nodes": [
    { "id": "calculator", "module": "CalculatorServer", ... },
    { "id": "metrics", "module": "PipeMeterTransform", ... },
    { "id": "tty-renderer", ... }
  ]
}
```

**Change connections:**

```json
{
  "connections": [
    { "from": "calculator.output", "to": "metrics.input" },
    { "from": "metrics.output", "to": "tty-renderer.input" }
  ]
}
```

### Customize Module (src/index.ts)

**Add new endpoints:**

```typescript
if (url.pathname === '/multiply') {
  const a = parseFloat(url.searchParams.get('a') || '0');
  const b = parseFloat(url.searchParams.get('b') || '0');
  const result = (a * b).toFixed(precision);
  res.end(JSON.stringify({ result: parseFloat(result) }));
}
```

**Add request logging:**

```typescript
console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
```

### Customize Profiles (.mk/options.json)

**Add staging profile:**

```json
{
  "profiles": {
    "staging": {
      "logLevel": "info",
      "gates": { "MK_LOCAL_NODE": "0" },
      "params": { "port": 8080 }
    }
  }
}
```

---

## Advanced Bootstrap Patterns

### Pattern 1: Multiple Projects from Same Template

```bash
# Bootstrap multiple apps
mk init calculator-prod --lang ts --preset tty
mk init calculator-dev --lang ts --preset tty
mk init calculator-test --lang ts --preset tty

# Install mkolbol in each
for dir in calculator-*; do
  cd $dir
  npm install ../mkolbol-0.2.0.tgz
  cd ..
done
```

### Pattern 2: Custom Init Templates

Create your own init template by copying and modifying:

```bash
# Copy default template
cp -r /path/to/mkolbol/examples/mk/init-templates/hello-calculator my-template

# Customize my-template/
# - Edit mk.json
# - Modify src/index.ts
# - Update .mk/options.json

# Use custom template (feature coming soon)
mk init my-project --template file:./my-template
```

### Pattern 3: Monorepo Bootstrap

```bash
# Bootstrap multiple apps in monorepo
mkdir -p packages
cd packages

mk init calculator --lang ts --preset tty
mk init logger --lang ts --preset tty
mk init metrics --lang ts --preset tty

# Install shared mkolbol
cd ..
npm install file:./vendor/mkolbol

# Link to each package
cd packages/calculator && npm install file:../../node_modules/mkolbol
cd packages/logger && npm install file:../../node_modules/mkolbol
cd packages/metrics && npm install file:../../node_modules/mkolbol
```

---

## Common Use Cases (After Bootstrap)

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
    params: { prefix: '[console]' }

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
import { Kernel, Hostess, StateManager, Executor, RoutingServer } from 'mkolbol';

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
        params: { periodMs: 1000 },
      },
      {
        id: 'console',
        module: 'ConsoleSink',
        params: { prefix: '[log]' },
      },
    ],
    connections: [{ from: 'timer.output', to: 'console.input' }],
  };

  try {
    await executor.load(config);
    await executor.up();

    // Run for 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));

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

  constructor(
    private kernel: Kernel,
    private options: any = {},
  ) {}

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

| Issue                   | Solution                                                       |
| ----------------------- | -------------------------------------------------------------- |
| "Config file not found" | Use absolute path: `mkctl run --file $(pwd)/topology.yml`      |
| "Command not found"     | Use full path: `/usr/bin/node` instead of `node`               |
| "Health check failed"   | Verify service is running: `curl http://localhost:3000/health` |
| "Port already in use"   | Find/kill process: `lsof -i :3000 && kill -9 <pid>`            |
| "Permission denied"     | Fix file permissions: `chmod 755 logs/`                        |

### Getting Help

- **Troubleshooting**: See [Doctor Guide](./doctor.md)
- **Examples**: Check `examples/configs/` in the repo
- **Tutorials**: Start with [Hello Calculator](./hello-calculator.md)
- **Reference**: See [mkctl Cookbook](./mkctl-cookbook.md)

## Next Steps

After bootstrapping your first project:

- **[Hello Calculator Tutorial](./hello-calculator.md)** - Manual walkthrough (alternative to mk init)
- **[First Five Minutes](./first-five-minutes.md)** - Complete mk workflow (init → run → doctor → build → package → ci plan)
- **[Authoring a Module](./authoring-a-module.md)** - Write custom modules with tests
- **[mk dev, logs, trace Guide](./mk-dev-logs-trace.md)** - Development ergonomics
- **[mkctl Cookbook](./mkctl-cookbook.md)** - Daily mkctl commands
- **[Doctor Guide](./doctor.md)** - Troubleshooting common issues

## Quick Reference

**Bootstrap a new project:**

```bash
mk init my-project --lang ts --preset tty
cd my-project
npm install /path/to/mkolbol-0.2.0.tgz
npm run build
mk run --file mk.json --duration 10
```

**Verify your project:**

```bash
mk doctor --file mk.json
mk run --file mk.json --dry-run
```

**Package for distribution:**

```bash
mk build
mk package
# → my-project-0.1.0.tgz
```

**Generate CI config:**

```bash
mk ci plan --output
# → .github/workflows/test.yml
```

---

**Ready to bootstrap?** Run `mk init hello-calculator` and get started in 5 minutes.
