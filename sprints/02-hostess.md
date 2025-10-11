# Sprint 2: Hostess (In-Process Registry)

Scope
- In-process service registry (“Hostess”) managing a guest book of available servers/modules.
- Register/unregister lifecycle; query by mask/type/capabilities.
- Track port/endpoint reservations for in-proc usage (symbolic ports/ids only).
- Manifests for module metadata (name, type: input/source/transform/output, terminals).
- No persistence beyond process memory.

Stories
- Define manifest schema (TypeScript interface) for modules/servers with terminals (ports) and capabilities.
- Implement Hostess class:
  - register(manifest): string id
  - unregister(id): void
  - list(filter?): Manifest[]
  - reserve(nameOrId, terminalName): Reservation
  - release(reservation): void
- Add capability filters (accepts, produces, feature tags).
- Provide simple UUID allocation and conflict checks.

Deliverables
- src/hostess/Hostess.ts (in-proc registry)
- src/types/manifest.ts (manifest + terminal types)
- tests/hostess/*.spec.ts (register, query, reserve/release)
- examples/hostess-demo.ts: register two modules, query by type, reserve ports

Out of Scope
- Network transport, persistence, auth.
- Health checks/heartbeats.

Demo Checklist
- pnpm run build && pnpm run test: Hostess tests pass.
- Run hostess demo: shows registration, filtered listing, and reservation flow.
