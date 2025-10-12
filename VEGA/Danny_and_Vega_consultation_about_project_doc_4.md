# Danny and Vega: Consultation About Project — Doc 4

Version: 1.0
Date Context: workflows, naming/Hostess, reservations/LLDP, probe/beacon, executor
Scope: Technical summary without recommendations

## Two Workflows Informing Initial Server Component

- Workflow 1: Dual single-binary deployments
  - Each machine ships a single executable with sufficient built-in capability for mesh behavior.
  - Later, each system should learn/know the other’s capabilities.
- Workflow 2: Single, more static system
  - Kernel is wired at startup based on a specification.
  - Emphasis on deterministic configuration over discovery.

## State Machine and Control Surface (HMI)

- Central state machine tracks and controls all kernel pipe operations.
- Must enumerate: all pipes/connections touching the kernel; addresses; metadata; flow and status.
- Presents a control surface usable by AI or human operators (refinery/HMI analogy).
- Reports operational metrics (e.g., flow rates) and current topology.
- Supports an initial state derived from a “wiring file” (compile-time configuration) that sets connections at startup.
- Linting/testing of the wiring file validates server presence and connectivity assumptions at build time.
- Routing/discovery not required for fully compiled/static configurations; those can be realized as separate servers when needed.

## Exposure and Visualization

- The system exposes enough structural and runtime data (flow, connections, endpoints, multiplex/combiner relations) to enable external programs to render accurate topology diagrams.
- A mechanism exists to construct a pipeline and “upload” it so that the configuration can be compiled in at build time.
- Other servers require query and modification interfaces to inspect and adjust the live topology.

## Connection Semantics

- Connections are unique and addressable.
- Topology must express:
  - Fan-out/multiplexing: “these are multiplexed from the output of this”.
  - Fan-in/combining: “these are combined from the inputs of these”.
  - Explicit routing: “this routes to server XYZ (unique ID + human-readable metadata) to terminal ‘XXXX’”.

## Naming and Manifests

- Compile-time manifests define server identity, terminal names, and intended flow directions (input, output, output multiplexer, input combiner).
- On startup, servers register themselves and their interface metadata to a dedicated registry server (“The Hostess”).
- Explicit declaration by server authors ensures correct registration and prevents miswiring (e.g., output wired as input).

## The Hostess and the Guest Book

- Hostess maintains a guest book of registered servers and their terminals, along with availability/in‑use tracking.
- Naming convention (guest book identity string):
  - `fqdn:servername:classHex:owner:authFlag(auth yes|no|optional):authMechanism:uuid`
- Hostess responsibilities (as described):
  - Provide queries/filters (masks) to locate servers matching criteria (e.g., “4 servers of type XYZ”).
  - Track per-terminal usage; require a connectome ID from the control surface/state machine for mappings.
  - Serve as source of truth for server presence/availability; control surface serves as source of truth for connection topology (connectome).

## Reservations Concept

- Hostess accepts “reservations” for resources/terminals.
- Reservation sources:
  - Local “walk-ins”.
  - Remote “phone calls” (inter‑machine requests).
- Hostess can share menu/availability information with peer systems to support cross‑site fulfillment.

## LLDP‑Style Discovery and Connectivity Knowledge

- Systems exchange LLDP‑like messages advertising capabilities and preferred connectivity methods.
- A dedicated “probe” server tests connectivity mechanisms (ports, addresses, transports) and publishes working candidates.
- Probe on System A can inform System B which connection types to attempt first, based on verified results.
- Connectivity knowledge is cached/advertised to reduce future probing overhead.

## Probe and Beacon Protocol (sketch)

- Executor can spawn a probe process with instructions:
  - Scan listening ports across all local IPs within an allowed range (non‑privileged).
  - Start a beacon that listens on a specified port range, skipping ports already in use.
  - Use shared passphrase and per‑session hashes for authentication/verification.
  - Probe verifies beacon identity by hash(passphrase, challenge) exchange.
  - Report discovered working connection points and full IP/port matrix to the beacon’s primary port.
  - Send completion notice; receive authenticated “terminate” from beacon; exit.
- Off‑machine probing envisioned as a future extension.

## Minimal Executor

- A minimal executor boots services when the kernel starts; initial implementation can be code‑specified (hard‑coded) for simplicity.
- Future evolution includes starting external processes.
- Intent aligns with an executor model that can orchestrate server lifecycles and integrate with Hostess/reservations.

## Control Surface and Hostess Interaction Pattern

- Control surface computes a connection plan and requests resources from Hostess using filter criteria (counts/types).
- Hostess returns server identities and terminal info; control surface returns connectome IDs for booked terminals.
- Both sides maintain their respective truths: Hostess (resources/availability) and control surface (topology/connectome).
