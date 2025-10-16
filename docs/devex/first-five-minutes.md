# First Five Minutes: Local Node v1.0

**Get your first mkolbol topology running in 5 minutes.**

Welcome to mkolbol! This guide will take you from zero to a running topology in five minutes. No complex setup, no deep architecture study—just clone, run, and see it work.

⏱️ **Total time: 5 minutes**

---

## 1. What is mkolbol? (2 min read)

**One sentence:** mkolbol is a stream-based microkernel that lets you wire together data processing modules (like HTTP servers, transforms, and outputs) into flexible topologies using simple YAML configs.

### Why it matters for AI agents

AI agents need to:
- **Observe** streams of data (terminal output, HTTP logs, sensor data)
- **Transform** that data in flight (parse, filter, compress)
- **Route** data to multiple destinations (screen, logger, AI model)
- **React** to changes without rebuilding pipelines

mkolbol gives you this for free. Write modules once, wire them flexibly, run them anywhere.

### What you can do with it

```
HTTP Server (logs) → Parser → Split ┬→ Console (live view)
                                     ├→ Logger (persistent)
                                     └→ AI Agent (analysis)
```

**Real-world examples:**
- Build terminal hijackers (capture shell I/O for AI analysis)
- Create data pipelines (HTTP logs → filters → multiple sinks)
- Stream processing (sensor data → transforms → dashboards)
- MCP servers with observability (debug every message in flight)

**The mkolbol promise:** Write once, wire flexibly, observe everything.

---

## 2. Local Node v1.0: The Basics (2 min read)

### What is in-process routing?

**Local Node mode** means all modules run in a single Node.js process or as child processes on one machine. No network, no distributed routing, just local pipes.

This is the **fastest path to productivity**:
- Clone → config → run
- Perfect for development and testing
- Ideal for single-machine deployments
- Foundation before scaling to distributed mode

### The MK_LOCAL_NODE=1 environment variable

To ensure you're running in Local Node mode (and prevent accidental network features):

```bash
export MK_LOCAL_NODE=1
```

**What this does:**
- ✅ **Enables:** In-process RoutingServer, Executor, Hostess, StateManager
- ❌ **Disables:** Network transports, distributed routing, multi-machine topologies
- 🔒 **Validates:** Config loader rejects any node with `type=network` or `address` parameters

**When to use Local Node mode:**
- Local development and testing (today)
- Single-machine deployments (today)
- Learning mkolbol concepts (today)

**Future:** When `MK_LOCAL_NODE=0` or unset, distributed routing will be available.

### Key concepts (quick definitions)

| Component | What it does |
|-----------|--------------|
| **Kernel** | ~100 line core API: creates pipes, connects modules |
| **Router** | Tracks all running modules and their endpoints |
| **Executor** | Loads configs, starts/stops modules, manages lifecycle |
| **Hostess** | Service registry with heartbeat monitoring |
| **Module** | A functional unit (HTTP server, parser, console output, etc.) |

**Mental model:** Kernel = plumbing, Modules = functionality, Executor = orchestrator.

---

## 3. Your First Topology (Copy & Paste) (3 min)

Let's run the canonical Local Node v1.0 demo: an HTTP server that logs requests to your console.

### Step 1: Clone and build (90 seconds)

```bash
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm install
npm run build
```

### Step 2: Run the topology (30 seconds)

```bash
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 10
```

**Expected output:**
```
[mkctl] Running in Local Node mode (MK_LOCAL_NODE=1): network features disabled.
Loading config from: examples/configs/http-logs-local.yml
Bringing topology up...
Topology running for 10 seconds...

[http] Server listening on http://localhost:3000
```

### Step 3: Send a request (in another terminal)

```bash
curl -s http://localhost:3000/hello
```

**Terminal 1 output (where mkctl is running):**
```
[http] [2025-10-17T04:15:23.456Z] GET /hello
```

**Terminal 2 output (where curl ran):**
```
ok
```

### What just happened?

1. **web node** (ExternalProcess): Spawned a Node.js HTTP server that logs requests to stdout
2. **sink node** (ConsoleSink): Read from web's output and displayed to terminal with `[http]` prefix
3. **Router**: Tracked both endpoints; snapshot saved to `reports/router-endpoints.json` at shutdown
4. **Local Node gate**: Enforced in-process routing only (no network features)

### The config file (examples/configs/http-logs-local.yml)

```yaml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "require('http').createServer((req,res)=>{console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);res.end('ok')}).listen(3000,()=>console.log('Server listening on http://localhost:3000'))"
      ioMode: stdio
      restart: never

  - id: sink
    module: ConsoleSink
    params:
      prefix: "[http]"

connections:
  - from: web.output
    to: sink.input
```

**Key takeaways:**
- **`ioMode: stdio`** - Lightweight, non-interactive data piping (perfect for HTTP logs)
- **`restart: never`** - Server won't auto-restart on crash
- **`prefix: "[http]"`** - ConsoleSink adds prefix to all output lines
- **Inline server** - No external files needed; server defined in config

### Inspect the routing snapshot

After the topology exits:

```bash
node dist/scripts/mkctl.js endpoints
```

Or view the raw JSON:

```bash
cat reports/router-endpoints.json | jq .
```

You'll see both endpoints (web and sink) with their metadata, timestamps, and coordinates.

---

## 4. What's Next? (2 min)

**You just ran your first topology!** Here's where to go from here:

### Immediate next steps

| If you want to... | Go here... |
|-------------------|-----------|
| **Understand the architecture** | [Early Adopter Guide](./early-adopter-guide.md) - Core concepts, mental models, glossary |
| **Run the full 3-terminal demo** | [Quickstart](./quickstart.md) - Complete Local Node v1.0 walkthrough with live endpoint monitoring |
| **Validate everything works** | [Acceptance Pack](../../tests/devex/acceptance/local-node-v1.md) - Checklist for Local Node v1.0 |
| **Build your own module** | [First Server Tutorial](./first-server-tutorial.md) - Code a custom Transform or External process |

### Deep dives (when you're ready)

- **[Wiring and Testing Guide](./wiring-and-tests.md)** - Configure custom topologies, understand I/O modes
- **[mkctl Cookbook](./mkctl-cookbook.md)** - Daily reference for `mkctl run` and `mkctl endpoints`
- **[StdIO Path](./stdio-path.md)** - Lightweight data pipelines (no terminal overhead)
- **[Interactive Topology](./interactive-topology.md)** - Keyboard → PTY → Screen (full terminal features)
- **[Packaging Guide](./packaging.md)** - Bundle topologies as single executables
- **[Laminar Workflow](./laminar-workflow.md)** - Test observability and debugging

### Architecture deep dives

- **[Stream Kernel RFC](../rfcs/stream-kernel/00-index.md)** - Complete architecture documentation
- **[RoutingServer RFC](../rfcs/stream-kernel/05-router.md)** - Endpoint discovery and routing

---

## 5. Getting Help (1 min)

### Troubleshooting

**Config file not found:**
```bash
# Use absolute path
node dist/scripts/mkctl.js run --file $(pwd)/examples/configs/http-logs-local.yml --duration 10
```

**Server not starting:**
```bash
# Check if port 3000 is already in use
lsof -i :3000
```

**No endpoints registered:**
```bash
# Run topology with longer duration
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 15
```

**More help:** [mkctl Cookbook](./mkctl-cookbook.md) has a complete troubleshooting matrix with exit codes and fixes.

### Community support

- **[GitHub Issues](https://github.com/anteew/mkolbol/issues)** - Report bugs, request features
- **[GitHub Discussions](https://github.com/anteew/mkolbol/discussions)** - Ask questions, share ideas
- **[Contributing Guide](../../CONTRIBUTING-DEVEX.md)** - Feedback templates and contribution workflow

---

## Quick Reference Card

**Run a topology:**
```bash
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 10
```

**Inspect endpoints:**
```bash
node dist/scripts/mkctl.js endpoints
```

**Watch endpoints live:**
```bash
node dist/scripts/mkctl.js endpoints --watch --interval 1
```

**Stop early:**
```
Press Ctrl+C
```

**Example configs:**
```
examples/configs/
├── http-logs-local.yml        # HTTP → Console (this guide)
├── external-pty.yaml          # PTY demo (interactive shell)
└── external-stdio.yaml        # StdIO demo (data pipeline)
```

---

**That's it!** You've run your first topology, understood Local Node mode, and know where to go next.

**Time spent:** 5 minutes ⏱️

**What you learned:**
- ✅ What mkolbol is and why it matters
- ✅ Local Node v1.0 in-process routing
- ✅ How to run a topology from YAML
- ✅ How to inspect routing snapshots
- ✅ Where to go for deeper learning

**Ready to build?** Head to the [First Server Tutorial](./first-server-tutorial.md) and create your first custom module.
