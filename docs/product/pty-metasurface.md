# PTY Metasurface — Product Spec (P0)

Purpose

- Decouple terminal apps from the host PTY and re-route their I/O through a tiny stream microkernel so output can be observed, transformed, multicast, and rendered in arbitrary ways, and input can be programmatically injected — all without modifying the app.

Core idea

- Treat the PTY as a “surface” we can wrap. The wrapped app writes bytes and reads keystrokes like normal, but our system intercepts both directions and runs them through pipelines of composable modules.
- The kernel provides only pipe plumbing (create/connect/split/merge + registry). All semantics (parsing, rendering, networking, supervision) live in modules.

Primary P0 goals

- Hijack any terminal app via PTY wrapper and stream its output and input through the kernel.
- Fan-out output to multiple modules: e.g., standard screen renderer, braille/text transform, headless canvas renderer, TTS, or AI formatters.
- Sideband control channels for agents to observe state and inject inputs (keys/shortcuts) without disturbing the main output stream.
- Protocol agnostic: pipes carry bytes or objects; adapters add MCP/JSON-RPC/TCP/etc. as modules, not kernel features.
- Location transparency: everything works in-process first; later, the same modules can run as external servers and talk over the network via wrappers.

Non-goals (P0)

- Implementing an OS-level PTY driver. We use a PTY wrapper (node-pty) to spawn and intercept.
- Building a full TCP/IP stack inside the kernel. We may encapsulate or bridge out via modules later.
- Perfect terminal emulation. We lean on existing parsers/renderers and iterate.

Terms (concise)

- Surface: the app-facing interface (PTY) we wrap; the app is unaware.
- Pipe: a typed stream (bytes or objects) that connects modules.
- Module: a unit that reads/writes pipes (source/transform/output/routing).
- Wrapper: a module that adapts external processes (e.g., PTYServerWrapper).
- Hostess: a simple registry of available external servers and capabilities.
- Sideband: an auxiliary pipe for control/state separate from the primary terminal I/O.

Interfaces (P0)

- Pipes: Node streams; prefer `objectMode` for structured messages, allow byte streams for raw PTY.
- Capability registry: accepts/produces/features for discovery and simple routing.
- Sideband channels: modules may expose a `controlPipe` (objectMode) for state and control separate from main I/O.
- Minimal frame shape for object-mode:
  - Data: `{ type: 'data', payload: unknown, meta?: Record<string,unknown> }`
  - State: `{ type: 'state', snapshot: Record<string,unknown>, meta?: Record<string,unknown> }`
  - Control: `{ type: 'control', cmd: string, args?: Record<string,unknown> }`

Environment

- OS: macOS and Linux (P0); Windows support later.
- Node: 20+ recommended (tested: 20.x, 24.x).

Reference flows (P0 demos)

1. Dual render: Wrap `bash` via PTYServerWrapper. Fan out stdout to:
   - Passthrough renderer (stdout) for regular terminal
   - Braille/text transform module that logs to console (placeholder for real braille device)

2. Optional: Headless canvas snapshot (post-P0 candidate). Route output → ANSI parser → headless render; emit PNG buffers on sideband.

3. Programmatic input: An “agent input” module sends `ls -la\n` (or similar) into the PTY input after observing initial output, demonstrating control injection.

Sideband examples

- State probe: a module that tallies prompt detections or cursor positions and emits JSON state snapshots on a control pipe.
- MCP bridge: a module that converts selected state/messages to MCP and communicates with an external agent (later phase).

Accept criteria (P0)

- Demos run locally: dual render and programmatic input. Headless snapshot is optional.
- Tests cover kernel plumbing and at least one end-to-end example.
- README and this spec describe how to run each demo and what to expect.

Risks/constraints

- PTY behavior differs across OSes; target Node 20+, macOS/Linux first.
- Headless rendering cost; keep demo lightweight, off by default.

Roadmap sketch (post-P0)

- Externalization: run selected modules out-of-process and communicate via wrappers over sockets.
- Rich transforms: braille devices, TTS, video timelines, accessibility modules.
- Protocol adapters: MCP/JSON-RPC/TCP encapsulation as modules.
- Supervision and routing servers for multi-host deployments.
