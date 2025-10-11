# Sprint 3: StateManager (Control Surface / Topology)

Scope
- In-process StateManager tracking pipes, nodes, and connections (connectome).
- CRUD topology operations: createPipe, connect, split, merge via control API.
- Topology events (created/connected/disconnected) for observability and UI hooks.
- Validation/lint for wiring (terminal directionality and type compatibility when available).

Stories
- Define topology model:
  - Node { id, name, terminals[] }
  - Pipe { id, options }
  - Connection { id, from: TerminalRef, to: TerminalRef }
- StateManager class:
  - addNode(manifest): Node
  - createPipe(options): Pipe
  - connect(from, to): Connection
  - split(source, destinations[]): Connection[]
  - merge(sources[], destination): Connection[]
  - subscribe(listener): unsubscribe
- Validation hooks (opt-in): verify terminal directions and optional capability hints.
- Event bus for topology changes.

Deliverables
- src/state/StateManager.ts
- src/types/topology.ts
- tests/state/*.spec.ts
- examples/state-rewire.ts: dynamically rewire a running topology

Out of Scope
- External control API (keep in-proc), persistence.

Demo Checklist
- Tests pass; example shows creating nodes, wiring, rewiring with events logged.
