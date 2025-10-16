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

# DevEx — MKD Phase C Docs (Dev/Logs/Trace/Recipes)

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DEVX-P3-A", "parallel": true,  "tasks": ["D9951","D9952"] },
    { "id": "DEVX-P3-B", "parallel": true,  "depends_on": ["DEVX-P3-A"], "tasks": ["D9953","D9954","D9955"] }
  ],
  "tasks": [
    {"id":"D9951","agent":"devex","title":"Docs: mk dev / mk logs / mk trace — usage + troubleshooting",
      "allowedFiles":["docs/devex/first-five-minutes.md","docs/devex/quickstart.md","docs/devex/recipes.md","docs/devex/doctor.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9951_docs-dev-logs-trace.patch"]},

    {"id":"D9952","agent":"devex","title":"Examples: hot‑reload demo + logs/trace filters; acceptance notes",
      "allowedFiles":["examples/mk/dev-logs-trace/**","tests/devex/acceptance/local-node-v1.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9952_examples-dev-logs-trace.patch"]},

    {"id":"D9953","agent":"devex","title":"CLI help snapshots: update mk help with new commands (style guide)",
      "allowedFiles":["tests/cli/mkdxHelp.spec.ts","docs/devex/mk-dx-style.md"],
      "verify":["npm run build","npm run test:ci"],
      "deliverables":["patches/DIFF_D9953_cli-help-snapshots.patch"]},

    {"id":"D9954","agent":"devex","title":"Recipes page: curated patterns (tee→filesink, rate‑limit, backpressure)",
      "allowedFiles":["docs/devex/recipes.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9954_docs-recipes.patch"]},

    {"id":"D9955","agent":"devex","title":"Troubleshooting: hot‑reload edge cases, logs formatting, trace overhead",
      "allowedFiles":["docs/devex/doctor.md","docs/devex/troubleshooting.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9955_docs-troubleshooting-dev.patch"]}
  ]
}
```

Autonomy & Direction
- Focus on developer joy: ensure docs mirror actual CLI behavior, examples are copy‑paste runnable, and troubleshooting is practical.
- Use agent_template/AMPCODE_TEMPLATE.md; keep logs in `Vex/devex.log`.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```

Success Criteria
- First‑Five‑Minutes and Quickstart reflect mk dev/logs/trace and link to recipes.
- Examples run as‑is and demonstrate hot‑reload + logs + trace together.
- CLI help snapshots updated; style guide adhered to.
