```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "C2-A", "parallel": false, "tasks": ["T3001", "T3002"] }
  ],
  "tasks": [
    {
      "id": "T3001",
      "agent": "susan",
      "title": "Executor blue/green cutover under load",
      "allowedFiles": ["src/executor/Executor.ts", "tests/integration/processUnix.spec.ts"],
      "verify": ["npm run build", "MK_PROCESS_EXPERIMENTAL=1 npm run test:pty"],
      "deliverables": ["patches/DIFF_T3001_cutover-load.patch"]
    },
    {
      "id": "T3002",
      "agent": "susan",
      "title": "Backpressure + frame-boundary safety",
      "allowedFiles": ["src/pipes/**", "tests/integration/stdioPath.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T3002_frame-safety.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (Core: Cutover P2)

Goal: Robust drain+switch+teardown with zero data loss and frame-safe boundaries.

