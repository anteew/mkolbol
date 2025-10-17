# Danny and Vega: Consultation About Project — Doc 2

Version: 1.0
Date Context: post–Doc 1 follow‑up
Scope: Technical summary of terminology and deployment/ supervision discussion (no recommendations)

## Terminology: How Microkernel Folks Say It

Correct phrasings (Mach/Hurd style):

- “Servers run in user space”
- “Servers run on top of the kernel”
- “Servers communicate through the kernel”
- “The kernel provides IPC primitives” (in this project: stream pipes)
- “Servers use kernel‑provided IPC” / “Servers are kernel clients”

Avoid (monolithic connotation):

- “Servers run in the kernel”
- “The kernel contains/has servers”
- “The kernel executes servers”

Boundary emphasis:

- Kernel = plumbing (IPC, connections, registry)
- Servers = logic (PTY, parsing, recording, networking)
- Kernel is mechanism; server behavior is policy

## Architectural Positioning (as described)

- Application level: independent servers/modules (PTY server, Parser server, MP4 server)
- Kernel: provides stream‑based IPC (“pipes”), connection ops, and registry; unaware of semantics
- Servers register and route data via kernel‑provided pipes
- Node.js runtime underneath in current implementation

## Supervision and Restarts (Mach/Hurd precedent)

- Kernel does not restart servers
- Typical roles:
  - Bootstrap/init server: starts and monitors essential servers; name service
  - proc server: tracks processes, can notify on death
  - Peer monitoring: servers can watch each other via IPC
  - External supervisor (e.g., systemd‑like) can manage servers
- For this project’s framing: a “Supervisor” is another server; the kernel remains policy‑free

## Deployment Flexibility (location transparency)

- Goal: same server code and same kernel API with different pipe transports
- Pipe implementations (examples):
  - In‑process: PassThrough Duplex (single process)
  - Cross‑process: Unix domain socket–backed Duplex
  - Cross‑machine: TCP/WebSocket–backed Duplex
- Principle (L4/QNX lineage): mechanism matters, not location; location is policy
- QNX analogy: single API regardless of local vs remote provider

## Deployment Models (outlined)

- Single executable (single process)
  - All servers as in‑process modules on top of the kernel
  - Simple to run and debug
- Multi‑process (same machine)
  - Each server in its own process
  - Pipes via Unix sockets; socket paths via config/env
- Distributed (multiple machines)
  - Servers containerized or separate hosts
  - Pipes via TCP/WebSocket; connectivity defined by config/compose

## Advantages by Context (stated)

- Development (single process): fast, minimal overhead, straightforward debugging
- Testing (multi‑process): isolation, realistic IPC, targeted restarts
- Production (distributed): scaling, fault tolerance, specialized hardware (e.g., GPU for encoding)

## Embedded/Bare‑Metal Thought Experiment

- If ported to bare metal: kernel adapts to HAL (ring buffers instead of Node streams)
- Same kernel surface concept; different low‑level I/O implementation

## Phased Roadmap for Deployment Evolution

- Phase 1: Single process — PassThrough pipes (development/simple apps)
- Phase 2: Multi‑process — Unix sockets (testing/isolation)
- Phase 3: Distributed — TCP/WebSocket (scale/fault tolerance)
- Phase 4 (optional): Bare metal — ring buffers/HAL (embedded)

## Terminology Cheat Sheet (summary)

Say this:

- “Servers run on the kernel / through the kernel”
- “Kernel provides pipes; servers use kernel IPC”
- “Servers are kernel clients; servers run in user space”

Not this:

- “Servers run in the kernel / kernel has servers / kernel executes servers”

## Recap: Philosophy Statements

- Kernel = mechanism (pipes, connections, registry)
- Servers = policy (semantics and behavior)
- Location = deployment detail (config swaps transports)
- The kernel remains unchanged across deployment models; servers remain unchanged; configuration selects transport and placement
