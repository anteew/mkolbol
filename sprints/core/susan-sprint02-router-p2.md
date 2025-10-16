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
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (Core: Router P2)

Goal: Add TTL/heartbeat to routing and live `mkctl endpoints --watch`.

Constraints
- Kernel unchanged; Router/Executor/CLI only.

