# Doc 1 — Vision/Purpose, Concrete Ideas, Why It Matters

## Vision/Purpose

- Build a microkernel for terminal I/O as a data‑flow system: the kernel provides only pipes and a service registry; all semantics live in composable modules discoverable by capability.
- Use the terminal as the proving ground while keeping the kernel generally useful and transport agnostic.

## Concrete Ideas

- Kernel surface: `createPipe`, `connect`, `split`, `merge`, `register`, `lookup` (~60–100 LOC), leveraging Node Duplex streams with backpressure.
- Modules: input/source/transform/output; minimal interface (id/type/init/destroy, inputPipe/outputPipe) and capability descriptors (`accepts/produces/features`).
- Capability matching: register modules; lookup by `accepts`, `produces`, `type`, `features` to wire topologies.
- Canonical flows: minimal VT100 (Keyboard→PTY→Screen), multi‑input fan‑in, multi‑output fan‑out, dual‑path raw+parsed, remote viewer.
- Roadmap phases: kernel + basic modules → composability demos (parser/browser/MP4) → advanced inputs (voice/MCP) → container PTY → diverse outputs → browser extension → network transports.
- Testing strategy: unit (modules), integration (compositions), end‑to‑end; golden transcripts; performance notes (zero‑copy fast paths, O(N) fan‑out cost, backpressure).
- Configuration: declarative manifests (YAML/programmatic) to describe topology and routing.

## Why It Matters

- Stable, tiny core enables long‑lived compatibility; new features land as modules without kernel churn.
- Natural multi‑input/multi‑output composition supports rich terminal and AI use cases.
- Predictable performance and strong testability accelerate iteration and reduce regressions.
- Transport/location agnosticism opens paths from single process to distributed systems without rewrites.
