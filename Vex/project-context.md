# mkolbol Project Context

## What is mkolbol?

A stream-based **microkernel** architecture for terminal I/O and distributed AI agent systems.

**Core insight**: A ~100 line kernel that provides pure plumbing (pipes, connections, service registry). All semantics live in composable modules.

## Architecture

### The Kernel (~100 lines)
- `createPipe()` - Create bidirectional data channels (Node.js Duplex streams)
- `connect(from, to)` - Pipe data from source to destination
- `split(source, [dest1, dest2, ...])` - Fan-out (one source → multiple destinations)
- `merge([src1, src2, ...], dest)` - Fan-in (multiple sources → one destination)
- `register(name, capabilities, pipe)` - Advertise a service
- `lookup(query)` - Find services by capabilities

**Key principle**: Mechanism vs Policy. Kernel provides mechanism (pipes/registry), modules provide all policy (protocols, transformations, routing).

### Execution Modes
- **inproc** - In-process modules (Node.js classes)
- **worker** - Worker thread modules (Node.js workers)
- **external** - External processes (stdio-based)
- **pty** - PTY processes (interactive terminal)

### Key Systems
1. **Hostess** (Registry Server) - Service discovery, endpoint management, liveness checks
2. **StateManager** - Topology tracking, HMI, runtime introspection/control
3. **Executor** - Service lifecycle management, startup config, process spawning
4. **Adapters** - UnixPipeAdapter (data streaming), UnixControlAdapter (control/heartbeat)

## Design Principles

1. **Location transparent** - Same code runs in-process, multi-process, or distributed. Only pipe implementations change.
2. **Protocol agnostic** - Pipes carry bytes, JSON, objects, anything. Kernel doesn't parse.
3. **Composable** - Complex behaviors built from simple primitives (split/merge/connect).
4. **Never changes** - Kernel API stable from day 1. Features added as modules, never kernel edits.
5. **Infinitely extensible** - New modules need zero kernel changes.

## Current Sprint

**SB-DEVEX-EARLY-ADOPTER-P1**: Enable third-party developers to understand mkolbol, run locally, author servers, wire/test, and produce distributable runners.

**9 tasks across 4 waves:**
- Wave A (parallel): T8001, T8002 - Early adopter guide + quickstart
- Wave B (serial): T8003, T8004 - First server tutorial + wiring/testing
- Wave C (parallel): T8005, T8006, T8007 - Packaging + acceptance suite + Laminar workflow
- Wave D (serial): T8008, T8009 - Scaffolder RFC + feedback templates

## Constraints
- No kernel changes; scope limited to docs, examples, simple tooling, tests
- CI must stay green (Node 20/24, process-mode enforcement)
- Deterministic tests, avoid long sleeps/flakiness
