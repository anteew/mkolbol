```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "SCF-A", "parallel": false, "tasks": ["T6001"] }
  ],
  "tasks": [
    {
      "id": "T6001",
      "agent": "susan",
      "title": "mkctl init (gated) — scaffolder support for DevEx",
      "allowedFiles": ["scripts/mkctl.ts", "docs/devex/mkctl-init.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T6001_mkctl-init-gated.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (Core: Scaffolder Support)

Goal: Provide an optional, gated `mkctl init` path that DevEx can reference; feature-flagged with MK_DEVEX_INIT=1.

