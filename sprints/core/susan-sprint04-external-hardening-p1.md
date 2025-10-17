```json
{
  "ampcode": "v1",
  "waves": [{ "id": "E1-A", "parallel": false, "tasks": ["T4001", "T4002"] }],
  "tasks": [
    {
      "id": "T4001",
      "agent": "susan",
      "title": "ExternalProcess restart policies + backoff",
      "allowedFiles": [
        "src/wrappers/ExternalServerWrapper.ts",
        "tests/integration/externalFromConfig.spec.ts"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T4001_restart-backoff.patch"]
    },
    {
      "id": "T4002",
      "agent": "susan",
      "title": "Logs, env/cwd handling, exit-code mapping",
      "allowedFiles": [
        "src/wrappers/ExternalServerWrapper.ts",
        "scripts/mkctl.ts",
        "docs/devex/mkctl-cookbook.md"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T4002_logs-env-exitcodes.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (Core: ExternalProcess Hardening P1)

Goal: Production-grade ExternalProcess behavior: restart policies, backoff, logs, env/cwd, and exit-code mapping.
