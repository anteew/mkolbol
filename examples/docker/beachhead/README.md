# Docker Beachhead + Beacon/Probe Ingestor

Goal: Run a tiny server inside Docker that joins the OS‑Cloud by advertising its endpoint via UDP beacons; the host ingests beacons and registers endpoints with the in‑process Hostess.

Host (terminal A)

```bash
# 1) Start beacon ingestor on host (registers endpoints with Hostess)
npx tsx examples/docker/beachhead/host-beacon-ingestor.ts

# Output: [ingestor] listening for beacons on udp://0.0.0.0:53530
```

Container (terminal B)

```bash
# 2) Build & run the beachhead container (beacon → host.docker.internal:53530)
docker build -f examples/docker/beachhead/Dockerfile -t mkolbol-beachhead .
docker run --rm --name beachhead -e PORT=30018 -e DISCOVERY_TARGET=host.docker.internal:53530 -p 30018:30018 mkolbol-beachhead

# Output: [beachhead] Listening on TCP 30018 ... sending beacons every 3s
```

Observe the host ingestor printing registrations as the container sends beacons.

Notes

- This is a minimal beachhead. In a full setup, a Router/Registry composition would respond to beacons with probes and wire routes.
- The transport is pluggable: swap TCP with WebSocket by changing the server/client adapter and beacon `proto`.
