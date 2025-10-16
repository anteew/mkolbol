```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DX-11A", "parallel": true,  "tasks": ["LAM-1101", "LAM-1102", "LAM-1103"] },
    { "id": "DX-11B", "parallel": true,  "tasks": ["DEVEX-111", "DEVEX-112", "DEVEX-113"] },
    { "id": "DX-12A", "parallel": true,  "tasks": ["DEVEX-1201", "DEVEX-1202", "DEVEX-1203"] }
  ],
  "tasks": [
    {
      "id": "LAM-1101",
      "agent": "devex",
      "title": "Laminar cache keys per node+branch; aggregate PR comment",
      "allowedFiles": [".github/workflows/tests.yml", "scripts/post-laminar-pr-comment.js"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_LAM-1101_cache-keys-aggregate.patch"]
    },
    {
      "id": "LAM-1102",
      "agent": "devex",
      "title": "Flake budget summary in PR (last 5 runs)",
      "allowedFiles": ["scripts/post-laminar-pr-comment.js", "scripts/append-laminar-history.js"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_LAM-1102_flake-budget.patch"]
    },
    {
      "id": "LAM-1103",
      "agent": "devex",
      "title": "Acceptance smoke job: run mkctl http-logs-local-file.yml in CI (best-effort)",
      "allowedFiles": [".github/workflows/tests.yml", "examples/configs/http-logs-local-file.yml"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_LAM-1103_acceptance-smoke.patch"]
    },
    {
      "id": "DEVEX-111",
      "agent": "devex",
      "title": "Acceptance doc: expand FileSink walkthrough end-to-end",
      "allowedFiles": ["tests/devex/acceptance/local-node-v1.md", "docs/devex/quickstart.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-111_filesink-walkthrough.patch"]
    },
    {
      "id": "DEVEX-112",
      "agent": "devex",
      "title": "First Five Minutes: polish and add troubleshooting anchors",
      "allowedFiles": ["docs/devex/first-five-minutes.md", "README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-112_first-five-minutes-polish.patch"]
    },
    {
      "id": "DEVEX-113",
      "agent": "devex",
      "title": "mkctl cookbook: add endpoints --json + filters + health error mapping",
      "allowedFiles": ["docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-113_mkctl-cookbook-updates.patch"]
    },
    {
      "id": "DEVEX-1201",
      "agent": "devex",
      "title": "Doctor page: common mkctl errors, dry-run, health checks, file perms",
      "allowedFiles": ["docs/devex/doctor.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-1201_doctor.patch"]
    },
    {
      "id": "DEVEX-1202",
      "agent": "devex",
      "title": "Authoring a module: constructor(kernel, options), registry, tests",
      "allowedFiles": ["docs/devex/authoring-a-module.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-1202_authoring-module.patch"]
    },
    {
      "id": "DEVEX-1203",
      "agent": "devex",
      "title": "Acceptance smoke: non‑gating mkctl run + endpoints assert (aggregate PR comment)",
      "allowedFiles": [".github/workflows/tests.yml", "scripts/post-laminar-pr-comment.js"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-1203_acceptance-smoke-aggregate.patch"]
    }
  ]
}
```

# DevEx Sprint 11–12 — Laminar CI Refinement + Acceptance Docs + Doctor

Goal
- Strengthen CI insight (cache keys, aggregated PR comment, flake budget) and expand FileSink acceptance walkthroughs; add a “Doctor” page and an “Authoring a Module” guide to reduce support burden; keep docs aligned with TTY renderer and health features.

Autonomy & Direction for Vex
- You continue to own “Laminar and test strategy improvements.” You may run mini-sprints; create `Vex/minisprints/vex-sprint11-ms1.md` (use agent_template/AMPCODE_TEMPLATE.md) and log updates in `Vex/devex.log`.
- Please sweep your prior notes (see Vex/sprint10-investigation.md) and pull any outstanding items into this sprint if they accelerate Local Node v1.0.
- Keep changes best-effort in CI (never block merges on comment-post steps). Surface concerns and propose mitigations in ampcode.log.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```

Success Criteria
- Laminar history uses per-node/per-branch cache keys and a single aggregated PR comment per run.
- PR comment includes a flake budget summary (e.g., ≥2 failures in last 5 runs).
- Acceptance doc shows a complete FileSink flow; quickstart/first‑five‑minutes remain consistent.
- Cookbook documents endpoints --json, metadata filters, and health exit mapping.
