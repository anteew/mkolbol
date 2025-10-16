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

# DevEx — Distribution Without npm Registry (Tarball‑first Developer Experience)

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DEVX-P2-A", "parallel": true,  "tasks": ["D9901","D9902"] },
    { "id": "DEVX-P2-B", "parallel": true,  "depends_on": ["DEVX-P2-A"], "tasks": ["D9903","D9904","D9905"] },
    { "id": "DEVX-P2-C", "parallel": false, "depends_on": ["DEVX-P2-B"], "tasks": ["D9906","D9907"] }
  ],
  "tasks": [
    {"id":"D9901","agent":"devex","title":"Docs: Distribution matrix (Tarball recommended, Git tag pinned, Vendor path)",
      "allowedFiles":["docs/devex/using-mkolbol-in-your-repo.md","docs/devex/packaging.md","README.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9901_docs-distribution-matrix.patch"]},

    {"id":"D9902","agent":"devex","title":"Hello Calculator: tarball install path; update Quickstart & First‑Five‑Minutes",
      "allowedFiles":["docs/devex/hello-calculator.md","docs/devex/quickstart.md","docs/devex/first-five-minutes.md","examples/mk/hello-calculator/**"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9902_docs-hello-calculator-tarball.patch"]},

    {"id":"D9903","agent":"devex","title":"Releases doc: how to create tags and consume GitHub Release tarballs",
      "allowedFiles":["docs/devex/releases.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9903_docs-releases.patch"]},

    {"id":"D9904","agent":"devex","title":"Cookbook: install from tarball, pin to GitHub tag, vendor via file:",
      "allowedFiles":["docs/devex/mkctl-cookbook.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9904_docs-cookbook-no-registry.patch"]},

    {"id":"D9905","agent":"devex","title":"Consumer acceptance doc: running the fixture app locally",
      "allowedFiles":["tests/consumer/README.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9905_docs-consumer-acceptance.patch"]},

    {"id":"D9906","agent":"devex","title":"PR template note: prefer tarball path; keep CI comment non‑gating",
      "allowedFiles":[".github/pull_request_template.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9906_pr-template-tarball-note.patch"]},

    {"id":"D9907","agent":"devex","title":"mk fetch (experimental) docs; clearly flagged as optional",
      "allowedFiles":["docs/devex/packaging.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D9907_docs-mk-fetch-experimental.patch"]}
  ]
}
```

Direction & Autonomy
- Treat “Tarball‑first distribution” as the default path in docs. Do not mention npm registry publishing. Keep tone neutral and focused on reproducibility.
- Keep CI steps best‑effort and non‑gating for comments/artifacts.
- Use agent_template/AMPCODE_TEMPLATE.md when you run mini‑sprints; keep logs in Vex/devex.log.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
```

Success Criteria
- New developer can install mkolbol via tarball and complete Hello Calculator in < 10 minutes.
- Using‑in‑your‑repo and Quickstart are internally consistent and link to the same steps.
- Cookbook entries include copy‑paste commands for tarball, git tag pin, vendor.
- Consumer acceptance README provides an exact “try-it-now” flow.
