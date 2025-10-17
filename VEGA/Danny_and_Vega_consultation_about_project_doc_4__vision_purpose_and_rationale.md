# Doc 4 — Vision/Purpose, Concrete Ideas, Why It Matters

## Vision/Purpose

- Provide an operational control system (state machine + HMI) that can configure pipelines deterministically (compile‑time wiring) or coordinate dynamic meshes, with clear naming/manifests and a registry (Hostess) for resource tracking and allocation.
- Support reservations and LLDP‑style discovery (probe/beacon) while keeping routing/discovery as optional servers; include a minimal executor to start services.

## Concrete Ideas

- Two workflows:
  - Single‑binary per machine with later capability awareness across systems.
  - Static system wired at startup from a “wiring file.”
- State machine/HMI:
  - Tracks all pipes/connections, addresses, metadata, flow/status; exposes query/modify APIs; supports diagram rendering.
  - Initial state from wiring file; lint/tests at build time to validate availability and coherence.
- Connection semantics:
  - Unique, addressable connections; multiplex (fan‑out), combiner (fan‑in), explicit routes to server/terminal identifiers.
- Naming/manifests:
  - Compile‑time manifest defines server identity, terminals, and intended flow directions (input/output/multiplexer/combiner).
- Hostess (guest book):
  - Identity string: `fqdn:servername:classHex:owner:authFlag:authMechanism:uuid`.
  - Query/resource allocation via masks/filters; per‑terminal in‑use tracking; exchange of connectome IDs with control surface.
- Reservations:
  - Accept local (walk‑in) and remote (phone call) reservations; share menus/availability with peers.
- LLDP + probe/beacon:
  - Exchange connectivity hints; probe tests ports/transports; beacon authenticates via shared passphrase/challenges; cache working candidates.
- Minimal executor:
  - Boots services at kernel start (initially hard‑coded), with future external process support.

## Why It Matters

- Deterministic startup paths and clear operational visibility reduce on‑call toil and misconfiguration risk.
- Safe orchestration via explicit resource tracking and reservations enables elastic and multi‑tenant usage.
- Cross‑site interoperability (LLDP/probe) accelerates integration and reduces troubleshooting time.
- Clean separation of policy (control surface/Hostess) from mechanism (kernel pipes) keeps the core stable and auditable.
