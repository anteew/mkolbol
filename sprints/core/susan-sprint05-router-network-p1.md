```json
{
  "ampcode": "v1",
  "waves": [{ "id": "RN1-A", "parallel": false, "tasks": ["T5001", "T5002"] }],
  "tasks": [
    {
      "id": "T5001",
      "agent": "susan",
      "title": "Router transport adapter (Unix socket)",
      "allowedFiles": ["src/router/**", "tests/integration/router-network.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T5001_router-transport.patch"]
    },
    {
      "id": "T5002",
      "agent": "susan",
      "title": "mkctl endpoints --connect <addr>",
      "allowedFiles": [
        "scripts/mkctl.ts",
        "tests/cli/mkctlEndpoints.spec.ts",
        "docs/devex/stdio-path.md"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T5002_mkctl-connect.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (Core: Router Network P1)

Goal: Share endpoint announcements across processes on a single host via a simple Unix-socket adapter and mkctl discovery.
