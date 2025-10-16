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

# DevEx — Phase D Docs (init/build/package/ci‑plan)

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DEVX-P4-A", "parallel": true,  "tasks": ["D10001","D10002"] },
    { "id": "DEVX-P4-B", "parallel": true,  "depends_on": ["DEVX-P4-A"], "tasks": ["D10003","D10004","D10005"] }
  ],
  "tasks": [
    {"id":"D10001","agent":"devex","title":"Docs: mk init/build/package/ci‑plan — command guides + First‑Five‑Minutes updates",
      "allowedFiles":["docs/devex/first-five-minutes.md","docs/devex/quickstart.md","docs/devex/packaging.md","docs/devex/releases.md","docs/devex/ci-acceptance-smoke.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10001_docs-init-build-package-ci.patch"]},

    {"id":"D10002","agent":"devex","title":"Examples: mk init template(s) — hello-calculator init path",
      "allowedFiles":["examples/mk/init-templates/**","examples/mk/hello-calculator/**"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10002_examples-init-hello.patch"]},

    {"id":"D10003","agent":"devex","title":"CI plan doc: copy‑paste Actions snippet + cache keys; Laminar hooks",
      "allowedFiles":["docs/devex/ci-acceptance-smoke.md","README.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10003_docs-ci-plan.patch"]},

    {"id":"D10004","agent":"devex","title":"Help snapshots: add mk init/build/package/ci help; enforce style",
      "allowedFiles":["tests/cli/mkdxHelp.spec.ts","docs/devex/mk-dx-style.md"],
      "verify":["npm run build","npm run test:ci"],
      "deliverables":["patches/DIFF_D10004_cli-help-snapshots-phase-d.patch"]},

    {"id":"D10005","agent":"devex","title":"DX checklist updates for Phase D; add ‘did‑you‑mean’ verification section",
      "allowedFiles":["docs/devex/mk-dx-checklist.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10005_dx-checklist-phase-d.patch"]}
  ]
}
```

Autonomy & Direction
- Keep everything copy‑paste runnable; prefer tarball/git‑tag paths (no npm registry).
- Use the template; keep a concise log in `Vex/devex.log`.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```

Success Criteria
- First‑Five‑Minutes and Quickstart mirror mk init/build/package/ci‑plan.
- CI plan doc provides a working Actions snippet with Laminar hooks.
- Help snapshots include new commands; style guide adhered to.
