```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "MKD-P3-A",  "parallel": true,  "tasks": ["T9301","T9302"] },
    { "id": "MKD-P3-B",  "parallel": true,  "depends_on": ["MKD-P3-A"], "tasks": ["T9303","T9304"] }
  ],
  "tasks": [
    {"id": "T9301", "agent": "susan", "title": "mk dev: hot‑reload in‑proc modules (watch + restart)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/dev.ts", "src/executor/Executor.ts", "tests/cli/mkDev.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9301_mk-dev-hot-reload.patch"]},

    {"id": "T9302", "agent": "susan", "title": "mk logs: per‑module tail with filters (human + --json)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/logs.ts", "tests/cli/mkLogs.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9302_mk-logs.patch"]},

    {"id": "T9303", "agent": "susan", "title": "mk trace: sampled flow timings (Executor hooks)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/trace.ts", "src/executor/Executor.ts", "tests/cli/mkTrace.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9303_mk-trace.patch"]},

    {"id": "T9304", "agent": "susan", "title": "mk recipes: list curated patterns (tee→filesink, rate‑limit, etc.)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/recipes.ts", "docs/devex/recipes.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9304_mk-recipes.patch"]}
  ]
}
```

# Ampcode — MKD Phase C: Dev Ergonomics (dev/logs/trace/recipes)

Goal
- Deliver a fast developer loop: hot reload for in‑proc modules, structured logs, lightweight tracing, and discoverable recipes.

Constraints
- No kernel semantics changes. Hook via Executor and CLI; keep features opt‑in and safe by default.

Verification
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```
