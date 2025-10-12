# Danny and Vega: Consultation About Project — Doc 5

Version: 1.0
Date Context: external server wrappers, sprints/RFCs, application composition
Scope: Technical summary without recommendations

## External Server Wrappers (npm/C and others)

- Goal: Treat third‑party servers (npm packages, C binaries, etc.) as first‑class servers in the system.
- Approach: Build a wrapper that registers capabilities and adapts foreign servers to kernel pipes and conventions.
- Location transparency: Wrapped server may run in‑process or as a separate process; remote wrappers are possible.
- Executor role: Starts the wrapper, which in turn invokes the underlying server/package.
- PTY angle: If needed, run the wrapped program under a PTY (render to null or to a logging renderer) to fit the terminal‑centric origins.
- Interop: Wrapper must interoperate with “base” servers via shared capability semantics.
- Environment: Wrapper provides a minimal environment (env vars, CLI args, data paths) for the wrapped server.
- Standardization: Wrapper behavior would be standardized over time as corner cases are discovered.

## Composition: From Parts to Applications

- Need: A way to compose full applications from servers, executor, and control surface/state machine.
- Control surface/state machine: Owns the connection plan (how pipelines connect to terminals) and runtime control.
- Executor: Owns process lifecycle (start, restart, supervision) for declared servers.
- Application plan: A manifest‑driven description (likened to Kubernetes deployment manifests) to define both:
  - Control/wiring manifest for the control surface (topology/connectome).
  - Execution manifest for the executor (what to start and how).
- Minimum bootstrap: Executor starts declared servers; control surface wires them according to the manifest to produce a runnable application.

## Planning/RFCs (as raised)

- Questions at this stage:
  - What would the sprints for the wrapper and composition work look like?
  - Are additional RFCs needed for wrappers and application composition (timing and scope)?
  - Is now the right moment to draft RFCs and plan the sprints?
