# First Five Minutes with mkolbol

Welcome! You're about to experience the easiest way to get mkolbol running. Pick one of the three paths below based on what you want to do right now.

⏱️ **Total time: 5 minutes**

---

## 🚀 Path A: Run a Topology (No Code Required)

**For**: "I just want to see it work"

### What you'll do
Execute a pre-built topology config using `mkctl run` — no TypeScript, no setup beyond `npm install`.

### Commands
```bash
# Clone and build
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm install && npm run build

# Run the PTY demo via config (5 seconds)
node dist/scripts/mkctl.js run --file examples/configs/external-pty.yaml

# Or run for 10 seconds
node dist/scripts/mkctl.js run --file examples/configs/external-pty.yaml --duration 10
```

### What happens
- A bash shell runs in a PTY and streams output to your terminal
- The topology loads from YAML, runs modules, exits cleanly
- Watch for the demo output, then press Ctrl+C if needed

### Next: Learn more
- **[Quickstart Guide](./quickstart.md)** - Full walkthrough with troubleshooting
- **[mkctl run Documentation](./wiring-and-tests.md#running-configurations)** - Running your own configs

---

## 📊 Path B: Process Data Without Terminal Features

**For**: "I want to pipe data through filters (like `cat`, `jq`, `sed`)"

### What you'll do
Explore the **StdIO path** — lightweight I/O for non-interactive programs. No terminal overhead, maximum performance.

### Example
```bash
# Run the StdIO echo demo
npm run build
node dist/examples/stdio-echo-demo.js
```

### What happens
- Data flows through an external process without terminal emulation
- ~100μs latency (vs 500μs with PTY)
- Perfect for data transformation pipelines

### Next: Learn more
- **[StdIO Path Guide](./stdio-path.md)** - Deep dive on filters and pipelines
- **[Wiring Topologies](./wiring-and-tests.md#i-o-modes)** - Understanding stdio vs pty modes

---

## ⌨️ Path C: Build Interactive Applications

**For**: "I want to build an app that interacts with a shell or TUI"

### What you'll do
Explore the **Interactive path** — keyboard input → PTY → terminal output. Full terminal features, ANSI escape sequences, window resizing.

### Try it
```bash
npm run build

# Interactive demo (requires xterm library and terminal support)
node dist/examples/keyboard-pty-tty.js
```

### What happens
- Keyboard input flows to a bash shell running in PTY
- Terminal output renders with colors, formatting, cursor control
- You can interact with bash directly

### Next: Learn more
- **[Interactive Topology Guide](./interactive-topology.md)** - Keyboard → PTY → Screen pipelines
- **[Quickstart: PTY Demo](./quickstart.md)** - Step-by-step walkthrough

---

## 🤔 Stuck or have questions?

- **Errors running the demos?** See **[Troubleshooting Guide](./troubleshooting.md)**
- **Want to understand the architecture?** See **[Early Adopter Guide](./early-adopter-guide.md)**
- **Ready to build your own module?** See **[First Server Tutorial](./first-server-tutorial.md)**

---

## Quick Concept

mkolbol is a stream-based microkernel: **tiny kernel (~100 lines) + pluggable modules**. The kernel provides pipes and connections; modules handle semantics (terminal, data processing, AI logic, etc.).

Three execution modes:
- **inproc**: Fast, in-process (default)
- **external (stdio)**: Lightweight, language-agnostic
- **external (pty)**: Interactive, terminal-capable

The same code works locally with `inproc`, scaled with `external`, or distributed across machines. **Location transparency** means modules don't know where they run.

---

## Resources at a Glance

| I want to... | Go to... |
|---|---|
| Run a topology from YAML | **[Quickstart Guide](./quickstart.md)** or **[Wiring Guide](./wiring-and-tests.md)** |
| Build a module | **[First Server Tutorial](./first-server-tutorial.md)** |
| Test my module | **[Acceptance Tests](./tests/devex/README.md)** |
| Package for distribution | **[Packaging Guide](./packaging.md)** |
| Debug with logs | **[Laminar Workflow](./laminar-workflow.md)** |
| Understand architecture | **[Early Adopter Guide](./early-adopter-guide.md)** or **[RFC](../rfcs/stream-kernel/00-index.md)** |
| Report issues | **[Contributing Guide](../../../CONTRIBUTING-DEVEX.md)** |

---

**Ready?** Pick a path above and dive in. You'll have mkolbol running in 5 minutes.
