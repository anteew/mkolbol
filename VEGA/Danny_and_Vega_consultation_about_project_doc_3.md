# Danny and Vega: Consultation About Project — Doc 3

Version: 1.0
Date Context: follow‑up on distributed/multi‑machine routing
Scope: Technical summary of service mesh, routing servers, terminals, and multi‑hop flows (no recommendations)

## Distributed Service Mesh Concept

- Core idea: Distributed microkernel system with routing servers forming a service mesh.
- “Terminal” abstraction: connection points (local, network, loopback) managed by a routing server, analogous to airport terminals.
- Routing server roles:
  - Maintain terminals and a route table mapping service names → terminal (and optional machine ID / hop distance).
  - Forward data between terminals based on destination in message envelopes.
  - Announce local services and learn remote routes from announcements or a registry.

## Terminals and Routes

- Terminal types: `local`, `network`, `loopback`.
- Terminal shape (conceptual): `{ name, type, inputPipe, outputPipe, remoteAddress? }`.
- Route shape (conceptual): `{ serviceName, terminal, machineId?, hops }` with hop count for distance/selection.

## Routing Behavior and Envelopes

- Messages carry an envelope: `{ source, destination, replyTo?, data, ... }`.
- Router flow:
  1) Receive data on a terminal’s `inputPipe`.
  2) Parse destination from envelope.
  3) Lookup route; select destination terminal.
  4) Forward data via destination terminal’s `outputPipe`.
- Supports multi‑hop by forwarding between network terminals; hop counts used for route preference.
- Reply path (hairpin) uses `replyTo` addressing; return traffic may traverse back to origin over a different terminal.

## Service Discovery Approaches

- Mesh broadcasts (gossip): periodic service announcements on network terminals containing local services and known routes; receivers learn routes and increment hops.
- Central registry: a registry server provides `register`/`lookup` for service → location; routers populate their route tables from the registry.
- Both approaches can coexist; learned routes include machine IDs and hop counts.

## Multi‑Machine Scenarios (A/B/C example)

- Machine A: PTY, Display; Router with terminals to B and C.
- Machine B: Parser; Router with terminals to A and C.
- Machine C: GPU and Encoder; Router with terminals to A and B.
- Example flow (PTY → Parser → GPU → Encoder → Display):
  1) A routes PTY output to B’s parser (net terminal to B).
  2) B routes parsed data to C’s GPU (net terminal to C).
  3) C forwards GPU output to local encoder.
  4) C routes encoded result back to A’s display (net terminal to A).
  5) A delivers to local display.
- Route tables per machine map service names to the appropriate terminal (local or network) with hop info.

## Hairpin / Loopback Case

- Scenario: A lacks GPU; C has GPU. A sends a request to `gpu-server` (routed to C) with `replyTo: mp4-encoder@machine-a`.
- C’s router delivers to local GPU; GPU server replies to `replyTo`.
- C’s router forwards response back to A over the network terminal; A delivers to local encoder/display.

## Deployment and Transport

- Same kernel API with different pipe transports:
  - In‑process: PassThrough (single process).
  - Cross‑process: Unix domain socket–backed Duplex.
  - Cross‑machine: TCP/WebSocket–backed Duplex.
- Location transparency: servers are unaware of peer placement; configuration selects transport.

## Configuration‑Driven Topology

- Declarative deployment description enumerates machines, their services, and network terminals (addresses/ports).
- Routers use discovery to populate routes automatically; services are referred to by name throughout the mesh.

## Real‑World Analogues (referenced)

- Plan 9: “network dialers” and files as streams for distributed resources.
- QNX Neutrino: network‑transparent IPC; same API local/remote.
- Erlang: distributed messaging across nodes with location transparency.
- Kubernetes service mesh: service abstraction and routing to instances via labels.

## Key Properties (as articulated)

- Location transparency; replication and multi‑hop routing.
- Configuration controls placement; code remains unchanged.
- Kernel remains mechanism (IPC/connection/registry); routing/discovery implemented by servers.
