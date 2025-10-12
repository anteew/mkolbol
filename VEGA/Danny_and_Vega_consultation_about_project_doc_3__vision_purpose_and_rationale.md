# Doc 3 — Vision/Purpose, Concrete Ideas, Why It Matters

## Vision/Purpose
- Establish a distributed service mesh using routing servers and “terminals” so services communicate via envelopes across machines with location transparency, supporting multi‑hop and hairpin flows.

## Concrete Ideas
- Terminals: `local`, `network`, `loopback`; each with `inputPipe`/`outputPipe` and optional remote address.
- Routes: map `serviceName → terminal (machineId?, hops)`; prefer lower hop counts.
- Envelope fields: `{ source, destination, replyTo?, data, ... }` drive routing decisions.
- Router logic: receive on terminal → parse destination → lookup route → forward to destination terminal.
- Discovery:
  - Gossip/announcements: periodic broadcast of local services and known routes; receivers learn routes and increment hops.
  - Central registry: `register/lookup` for service → location; routers populate local tables.
- Config‑driven topology: declare machines, services, and network terminals (addresses/ports) to form the mesh.
- Hairpin case: use `replyTo` to send results back across machines to the origin or another endpoint.

## Why It Matters
- Scales pipelines across heterogeneous hardware (e.g., GPU offload) without changing server code.
- Increases resilience and flexibility via multi‑hop routing and alternative paths.
- Preserves the microkernel contract (pipes + discovery are mechanisms; routing policies live in servers).
