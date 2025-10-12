# Merged View — Doc 5 + Doc 4 (Diff‑Style)

Legend
- `==` Duplicate/similar across both docs
- `++` Complementary; works together when combined
- `--` Potential tension/contrast to reconcile
- Tags: `[D5]` = Doc 5 (wrappers/composition), `[D4]` = Doc 4 (HMI/Hostess/executor)

## Vision / Purpose
- == [D5][D4] Microkernel core stays minimal; servers (modules/wrappers) run on top and communicate through pipes.
- ++ [D5][D4] Compose full applications declaratively: executor starts things; control surface wires pipelines.
- -- [D4] Static compile‑time wiring path vs [D5] flexible composition with third‑party wrappers; reconcile via optional discovery.

## Core Components
- == [D4][D5] Executor: starts and restarts services; owns lifecycle.
- ++ [D5] External Server Wrappers: adapt npm/C/other binaries; register capabilities; optional PTY shell path.
- ++ [D4] Control Surface / State Machine (HMI): tracks all pipes/connections; provides query/modify APIs; initial wiring from spec.
- ++ [D4] Hostess (registry): guest book, reservations, identity schema; tracks per‑terminal availability.
- ++ [D4] Reservations: local/remote allocations with connectome IDs.
- ++ [D4] LLDP‑style Discovery + Probe/Beacon: learn viable transports and cache connectivity.

## Manifests / Specifications
- == [D5][D4] Need declarative inputs to bootstrap the system.
- ++ [D5] Execution Manifest → feeds Executor (what to start, params, env).
- ++ [D5] Control/Wiring Manifest → feeds Control Surface (how to connect terminals/pipes).
- ++ [D4] “Wiring file” (compile‑time) → initial topology; lint/test at build time.
- -- [D4] “No routing/discovery needed if baked at compile time” vs [D5] wrappers may rely on capabilities and dynamic composition. Resolution: make discovery optional.

## Naming / Identity / Registration
- ++ [D4] Guest‑book identity format: `fqdn:servername:classHex:owner:authFlag:authMechanism:uuid`.
- ++ [D5] Wrappers must register capabilities and terminals; align wrapper registration to Hostess schema.
- == [D4][D5] Terminals require explicit direction (input/output/multiplexer/combiner) to prevent miswiring.

## Workflows
- ++ [D4] Workflow A: Dual single‑binary systems that later learn about each other.
- ++ [D4] Workflow B: Static single system wired at startup by spec.
- ++ [D5] Wrapper‑driven integration: bring third‑party servers under uniform lifecycle + I/O.
- ++ Combined: Use wrappers as resources the Hostess can reserve; Control Surface uses specs to wire them.

## Routing / Discovery / Connectivity
- ++ [D4] LLDP + probe/beacon to determine working transports; share findings.
- == [D4][D5] Transport agnosticism preserved (pipes hide location; config selects transport).
- -- [D4] Pure compile‑time wiring path suggests zero discovery; [D5] external wrappers may appear dynamically. Strategy: static first, add discovery when needed.

## PTY Considerations
- ++ [D5] Run wrapped executables under PTY when beneficial (logging/null renderer supported) to fit terminal‑centric patterns.
- == [D4] HMI/control surface can expose flow/metrics regardless of PTY/non‑PTY source.

## Interfaces / Control Surface
- ++ [D4] Control surface is source of truth for connectome; Hostess is source of truth for resources/availability.
- ++ [D5] Application plan (manifests) drive both Executor and Control Surface for reproducible bootstraps.

## Potential Conflicts (Callouts)
- -- Static vs dynamic: [D4] emphasizes compile‑time wiring sufficiency; [D5] emphasizes runtime composition with wrappers. Treat discovery as optional layer; manifests remain primary.
- -- Registration scope: [D4] Hostess as central source for servers; [D5] wrappers could run remotely and register elsewhere. Require a consistent federation story (later).
- -- PTY assumption: [D5] suggests PTY shell path for foreign programs; [D4] is neutral. Keep PTY use case‑driven, not mandatory.

## Strong Overlaps (De‑duplication Targets)
- == Executor concept appears in both → unify into one component with clear API.
- == Declarative manifests/specs in both → unify naming and structure (execution vs wiring).
- == Terminals with direction and uniqueness → same vocabulary across Hostess, Control Surface, and Wrappers.

## Works Better Together (Synergies)
- ++ Wrappers + Hostess: wrappers register capabilities/terminals; Hostess manages reservations and availability; Control Surface binds them per manifest.
- ++ Probe/Beacon + Wrappers: probe discovers viable transports; wrappers pick the best transport transparently.
- ++ HMI + PTY lineage: even non‑TTY servers can be observed via standardized flow/metrics for consistent operational UX.

## Merged Checklist (Actionable Shape, concept only)
- == Single Executor API (start/stop/restart/query) used by both docs.
- == Dual‑manifest model (execution + wiring) with lintable schema.
- == Hostess guest‑book identity and per‑terminal usage tracking.
- == Control Surface connectome as source of truth; reservation IDs round‑trip to Hostess.
- == Optional discovery path (LLDP/probe) layered on top of static wiring.
- == Wrapper registration consistent with Hostess schema; capability semantics shared.
