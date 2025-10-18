# Rehydrate Checklist — OS‑Cloud (P26) — mkolbol

When you return from compaction, run these in order.

## 1) Sync + Build

```bash
cd /srv/repos0/mkolbol
git fetch origin && git switch -C main origin/main
npm ci && npm run build
npm run validate:template && npm run validate:sprint
```

## 2) Quick Sanity Demos

- Serial transport demo (no TCP/IP required):

```bash
npx tsx examples/network/serial-bridge/serial-bridge.ts
```

- Docker beachhead (Node) + host prober (in two terminals):

```bash
# Terminal A (host prober)
npx tsx examples/docker/beachhead/host-beacon-prober.ts

# Terminal B (container beachhead)
docker build -f examples/docker/beachhead/Dockerfile -t mkolbol-beachhead .
docker run --rm -e PORT=30018 -e DISCOVERY_TARGET=host.docker.internal:53530 -p 30018:30018 mkolbol-beachhead
```

- Docker beachhead (Go, static) + host prober:

```bash
# Terminal A (host prober)
npx tsx examples/docker/beachhead/host-beacon-prober.ts

# Terminal B (go beachhead)
docker build -f examples/docker/go-beachhead/Dockerfile -t go-beachhead .
docker run --rm -e PORT=30018 -e DISCOVERY_TARGET=host.docker.internal:53530 -p 30018:30018 go-beachhead
```

## 3) Where to look (Docs)

- OS‑Cloud philosophy: docs/rfcs/stream-kernel/13-os-cloud.md
- Threads vs forks & CWD: docs/devex/threads-vs-forks-and-cwd.md
- Authoring CWD checklist: docs/devex/authoring-a-module.md

## 4) ProbeManager + mkctl (after agents land P26)

- mkctl endpoints watch (TTL, live/probed)
- mkctl probe <coord>

## 5) Xenomorph Requests

- Branch: mkolbol-architect-requests-for-xenomorph-architect (in ~/repos/xenomorph)
- Dir: MKOLBOL_REQUESTS_FOR_XENOMORPH_ARCHITECT/
- Engage Xenomorph architect after P26 acceptance passes.

## 6) Useful one‑liners

- Trim PR summary for rehydration (replace 101 with latest PR):

```bash
npm run agents:hydrate -- --pr 101
```

- Local fast CI:

```bash
npm run ci:local:fast
```
