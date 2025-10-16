# Routing Server (In-Process Skeleton)

## Overview

The RoutingServer is an in-process registry that tracks announced endpoints and provides read-only snapshots to interested modules. It is the first milestone toward a distributed routing mesh; for now we focus on deterministic, in-memory behaviour so higher-level components (Executor, mkctl) can integrate without network dependencies.

### Responsibilities

- Maintain a map of endpoints keyed by `id`.
- Accept announcements (`announce`) and withdrawals (`withdraw`) from local producers.
- Provide a defensive copy of the current endpoints via `list()`.
- Emit Laminar-friendly debug events (`debug.emit('router', ...)`) so announcements appear in existing logs.

### Data Model

Each endpoint is described by:

- `id`: stable identifier (e.g., `nodeId.terminal`).
- `type`: classification (`input`, `output`, `transform`, `routing`, ...).
- `coordinates`: free-form location string (`node:keyboard1`, `tcp://host:port`, etc.).
- `metadata`: optional shape data advertised by the producer.
- `announcedAt`: timestamp (ms) when the endpoint was first seen.
- `updatedAt`: timestamp (ms) of the most recent announcement.

### Behaviour

- `announce()` upserts entries. Re-announcing an existing `id` updates the metadata and `updatedAt`, preserving `announcedAt`.
- `withdraw()` removes the entry if it exists (no error if it doesn’t).
- `list()` clones the stored entries so callers cannot mutate internal state.

### API Surface (P1)

```typescript
const router = new RoutingServer();

router.announce({
  id: 'node:timer1',
  type: 'inproc',
  coordinates: 'node:timer1',
  metadata: { module: 'TimerSource', runMode: 'inproc' }
});

router.list();
// → [ { id, type, coordinates, metadata, announcedAt, updatedAt } ]

router.withdraw('node:timer1');
```

Announcements are idempotent—calling `announce` again with the same `id` updates `metadata` / `updatedAt` and emits a Laminar event (`debug.emit('router','announce', …)`). Withdrawals emit `debug.emit('router','withdraw', { id })` when an entry is removed.

### Integration Points

- **Executor** calls `announceRoutingEndpoint` for every node spawn and withdraws on `down()` / restart.
- **mkctl run** attaches a RoutingServer instance to the Executor, then persists `router.list()` to `reports/router-endpoints.json` after the topology finishes.
- **mkctl endpoints** reads that snapshot and displays endpoint metadata (falling back to the existing Hostess snapshot when no router snapshot is available).

### Snapshot Format

`reports/router-endpoints.json` contains an array of objects with the shape:

```json
{
  "id": "localhost:timer1:0x0001:system:no:none:…",
  "type": "inproc",
  "coordinates": "node:timer1",
  "metadata": { "module": "TimerSource", "runMode": "inproc" },
  "announcedAt": 1739657045123,
  "updatedAt": 1739657045123
}
```

The snapshot is read-only and serves as a temporary observation tool until the router gains query/subscription APIs.

### Future Work

- Gossip / broadcast protocols for multi-process or network deployments.
- Filtering and subscription APIs.
- Health tracking / expiry for stale endpoints.
