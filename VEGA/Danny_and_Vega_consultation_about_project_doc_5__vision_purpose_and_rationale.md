# Doc 5 — Vision/Purpose, Concrete Ideas, Why It Matters

## Vision/Purpose
- Make external servers (npm packages, C binaries, etc.) first‑class citizens via a standard wrapper so they interoperate with base servers through kernel pipes and capability semantics.
- Compose real applications declaratively using manifests that drive both execution (what to start) and wiring (how to connect), enabling a reproducible bootstrap with executor + control surface.

## Concrete Ideas
- Wrapper standard:
  - Registers capabilities; adapts foreign server I/O to kernel pipes; injects env vars/CLI args/data paths.
  - Can run in‑process or as a separate process; remote wrapper instances appear identical at the capability level.
  - Optionally runs under PTY with null/logging renderers to fit terminal‑centric paths.
- Executor starts the wrapper which invokes the underlying server/package; lifecycle (start/restart) owned by executor.
- Application composition via two manifests:
  - Control/wiring manifest: connection plan for the control surface/state machine (topology/connectome).
  - Execution manifest: processes/servers for executor to start and supervise with parameters.
- Minimum bootstrap: executor brings up declared servers; control surface wires them per manifest to yield a runnable app.

## Why It Matters
- Leverages existing ecosystems (Node/C) without bespoke rewrites; increases capability surface quickly.
- Ensures consistent lifecycle and I/O semantics across heterogeneous components.
- Makes deployments reproducible and portable (same manifests → same system), improving operability and sharing.
- Preserves microkernel boundaries while allowing rich integrations and gradual standardization of wrappers.
