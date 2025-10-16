```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "R2-A", "parallel": false, "tasks": ["T2001", "T2002"] },
    { "id": "R2-B", "parallel": true,  "depends_on": ["R2-A"], "tasks": ["T2003"] }
  ],
  "tasks": [
    {
      "id": "T2001",
      "agent": "susan",
      "title": "RoutingServer TTL + heartbeat",
      "allowedFiles": ["src/router/RoutingServer.ts", "tests/integration/router-inproc.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T2001_router-ttl.patch"]
    },
    {
      "id": "T2002",
      "agent": "susan",
      "title": "Executor heartbeat announcements",
      "allowedFiles": ["src/executor/Executor.ts", "tests/integration/router-announcements.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T2002_executor-heartbeat.patch"]
    },
    {
      "id": "T2003",
      "agent": "susan",
      "title": "mkctl endpoints --watch + filters",
      "allowedFiles": ["scripts/mkctl.ts", "tests/cli/mkctlEndpoints.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T2003_mkctl-watch.patch"]
    }
    ,
    {
      "id": "T2004",
      "agent": "susan",
      "title": "Gate: MK_LOCAL_NODE=1 (loader + mkctl checks)",
      "allowedFiles": ["src/config/loader.ts", "scripts/mkctl.ts", "docs/devex/quickstart.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T2004_local-gate.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (Core: Router P2 — Local Node v1.0)

Goal: Add TTL/heartbeat to routing and live `mkctl endpoints --watch` for Local Node v1.0 (in‑proc Router only).

Constraints
- Kernel unchanged; Router/Executor/CLI only.
- Respect gate: `MK_LOCAL_NODE=1` (no network adapters/transports). Update loader/CLI to warn/reject network references when set.
