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

# DevEx — MK Dev Orchestrator Phase A (Docs, Examples, CI UX)

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DEVX-P1-A", "parallel": true,  "tasks": ["D9801","D9802"] },
    { "id": "DEVX-P1-B", "parallel": true,  "depends_on": ["DEVX-P1-A"], "tasks": ["D9803","D9804","D9805"] },
    { "id": "DEVX-P1-C", "parallel": false, "depends_on": ["DEVX-P1-B"], "tasks": ["D9806","D9807"] }
  ],
  "tasks": [
    {"id":"D9801","agent":"devex","title":"PR template requiring DX checklist (link to mk-dx-checklist)",
      "allowedFiles":[".github/pull_request_template.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9801_pr-template-dx-checklist.patch"]},

    {"id":"D9802","agent":"devex","title":"Docs: Using mkolbol in your repo + Hello Calculator tutorial",
      "allowedFiles":["docs/devex/using-mkolbol-in-your-repo.md","docs/devex/hello-calculator.md","docs/devex/first-five-minutes.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9802_docs-using-and-hello-calculator.patch"]},

    {"id":"D9803","agent":"devex","title":"Examples: hello-calculator (mk.json default + YAML variant)",
      "allowedFiles":["examples/mk/hello-calculator/**"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9803_examples-hello-calculator.patch"]},

    {"id":"D9804","agent":"devex","title":"CI: non‑gating acceptance smoke + aggregated Laminar PR comment",
      "allowedFiles":[".github/workflows/tests.yml","scripts/post-laminar-pr-comment.js"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9804_ci-acceptance-smoke-aggregate.patch"]},

    {"id":"D9805","agent":"devex","title":"Cookbook polish: endpoints --json, health exit mapping, FileSink JSONL",
      "allowedFiles":["docs/devex/mkctl-cookbook.md","docs/devex/quickstart.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9805_cookbook-polsih.patch"]},

    {"id":"D9806","agent":"devex","title":"DX style enforcements: finalize mk-dx-style/checklist; note snapshot scaffolds",
      "allowedFiles":["docs/devex/mk-dx-style.md","docs/devex/mk-dx-checklist.md","tests/cli/mkdxHelp.spec.ts","tests/cli/mkdxErrors.spec.ts"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9806_dx-style-and-snapshots.patch"]},

    {"id":"D9807","agent":"devex","title":"Laminar flake budget section (≥2 failures in last 5 runs)",
      "allowedFiles":["scripts/post-laminar-pr-comment.js","reports/history.jsonl"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9807_laminar-flake-budget.patch"]}
  ]
}
```

Autonomy & Direction for Vex
- You own “Laminar and test strategy improvements.” Run mini-sprints as needed; use `agent_template/AMPCODE_TEMPLATE.md` to create `Vex/minisprints/...` and log in `Vex/devex.log`.
- Prioritize developer onboarding clarity: “Using mkolbol in your repo” and “Hello Calculator” must be copy‑paste runnable.
- Keep CI additions non‑gating; graceful degradation if PR comment steps fail.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```

Success Criteria
- New dev completes “Hello Calculator” (init → run → bundle) in < 10 minutes.
- PR template includes checklist and links to DX style/guide.
- Aggregated PR comment shows Laminar summary + flake budget section.
- Quickstart/cookbook/first‑five‑minutes remain consistent and link to each other.
