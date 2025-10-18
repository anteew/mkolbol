# Go Beachhead (static, zero external deps)

Build a tiny static Go server that:

- Listens on TCP (echo + PING→PONG)
- Sends UDP beacons with JSON payload compatible with BeaconCodec
- Runs in any container base (distroless/static)

Build & Run

```bash
docker build -f examples/docker/go-beachhead/Dockerfile -t go-beachhead .
docker run --rm --name go-beachhead -e PORT=30018 -e DISCOVERY_TARGET=host.docker.internal:53530 -p 30018:30018 go-beachhead
```

Probe on host (optional)

```bash
npx tsx examples/docker/beachhead/host-beacon-prober.ts
```

Notes

- Binary is CGO_DISABLED=0; runs on musl/glibc and distroless/static.
- Extend to WS/WSS later with a tiny ws proxy or Go ws library.
