````json

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "P20B-MKCTL-CONNECT", "parallel": false, "tasks": ["D2001","D2002","D2003"] }
  ],
  "branch": "mkolbol-devex-p20-mkctl-connect",
  "tasks": [
    {"id":"D2001","agent":"devex","title":"mkctl --connect tcp://... | ws://... : minimal viewer (ConsoleSink)",
      "allowedFiles":["scripts/mkctl.ts","src/cli/connect.ts","tests/cli/mkctlConnect.spec.ts","examples/network/connect/**"],
      "why":"Let users attach to a remote pipe quickly without custom code.",
      "verify":["npm run build","npm run test:ci"],
      "deliverables":["patches/DIFF_D2001_mkctl-connect.patch"]},

    {"id":"D2002","agent":"devex","title":"Docs: mkctl cookbook + remote-host-setup updates; examples end-to-end",
      "allowedFiles":["docs/devex/mkctl-cookbook.md","docs/devex/remote-host-setup.md","docs/devex/network-quickstart.md","README.md"],
      "why":"Copy‑paste path for remote viewing via TCP/WS.",
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D2002_docs-mkctl-connect.patch"]},

    {"id":"D2003","agent":"devex","title":"Acceptance: ws/tcp smoke against examples; Laminar non‑gating job",
      "allowedFiles":[".github/workflows/tests.yml","scripts/ci-local.ts","tests/integration/wsPipe.spec.ts","tests/integration/tcpPipe.spec.ts"],
      "why":"Ensure basic connectivity stays green across changes.",
      "verify":["npm run ci:local:fast"],
      "deliverables":["patches/DIFF_D2003_mkctl-connect-acceptance.patch"]}
  ]
}
```

Branch Instructions
- IMPORTANT: Work only on `mkolbol-devex-p20-mkctl-connect`.
- Keep UX simple: `mkctl connect --url ws://host:30012/path` or `--url tcp://host:30010`.
- Output modes: human default, `--json` raw frames (length‑prefixed) for tooling.
- Do not add auth/TLS here; document SSH tunnel patterns instead.


```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "P19-LINT", "parallel": false, "tasks": ["D1901","D1902","D1903","D1904","D1905"] }
  ],
  "branch": "mkolbol-devex-p19-lint-cleanup",
  "tasks": [
    {"id":"D1901","agent":"devex","title":"ESLint pass: remove unused vars/args and obsolete eslint-disable",
      "allowedFiles":["src/**","scripts/**"],
      "why":"Reduce hundreds of warnings that slow agents and CI logs.",
      "verify":["npm run build","npm run lint"],
      "deliverables":["patches/DIFF_D1901_eslint-clean.patch"]},

    {"id":"D1902","agent":"devex","title":"Prettier sweep: format repo; refine .prettierignore for generated/patch files",
      "allowedFiles":[".prettierignore","**/*"],
      "why":"Fix style warnings en masse while excluding generated artifacts.",
      "verify":["npm run format:check"],
      "deliverables":["patches/DIFF_D1902_prettier-sweep.patch"]},

    {"id":"D1903","agent":"devex","title":"DX scripts: add lint:fix and format:write; wire into pre-push gate (warnings allowed)",
      "allowedFiles":["package.json","scripts/git-hooks/pre-push","docs/devex/local-ci.md"],
      "why":"Make it one-command to fix common issues before pushing.",
      "verify":["npm run lint:fix && npm run format:write && npm run ci:local:fast"],
      "deliverables":["patches/DIFF_D1903_dx-lint-fix-wireup.patch"]},

    {"id":"D1904","agent":"devex","title":"Docs: Archive guidelines + rotate heavy logs (devex/ampcode) to archives/",
      "allowedFiles":["README.md","docs/devex/local-ci.md","archives/**","devex.md"],
      "why":"Prevent agents from choking on very large files.",
      "verify":["rg -n 'archives/' README.md docs/devex/local-ci.md devex.md"],
      "deliverables":["patches/DIFF_D1904_archive-guidelines.patch"]},

    {"id":"D1905","agent":"devex","title":"Acceptance: reduce lint warnings by ≥70% and keep build/tests green",
      "allowedFiles":["tests/**","reports/**"],
      "why":"Measure outcome, not just changes; ensure no regressions.",
      "verify":["npm run build","npm run test:ci","npm run lint | tee reports/lint-summary.txt"],
      "deliverables":["patches/DIFF_D1905_lint-acceptance.patch"]}
  ]
}
````

Branch Instructions

- IMPORTANT: Run this sprint only on branch `mkolbol-devex-p19-lint-cleanup`.
- Do not change branches or merge; commit patches and logs as usual. The architect will handle PRs/merges.
- Use `npm run lint:fix` first; then address remaining warnings with targeted edits.
- Exclude generated outputs under `dist/`, `patches/`, and `reports/` from Prettier runs (via .prettierignore).
- Keep policy: warnings allowed; do not flip CI to fail-on-warn.

{
"ampcode": "v1",
"waves": [
{ "id": "DX-11A", "parallel": true, "tasks": ["LAM-1101", "LAM-1102", "LAM-1103"] },
{ "id": "DX-11B", "parallel": true, "tasks": ["DEVEX-111", "DEVEX-112", "DEVEX-113"] },
{ "id": "DX-12A", "parallel": true, "tasks": ["DEVEX-1201", "DEVEX-1202", "DEVEX-1203"] }
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

````

# DevEx — RC Sweep Docs (Hello in 10 Minutes + Release Notes)

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DEVX-RC-A", "parallel": true,  "tasks": ["D10101","D10102"] },
    { "id": "DEVX-RC-B", "parallel": true,  "depends_on": ["DEVX-RC-A"], "tasks": ["D10103","D10104","D10105"] }
  ],
  "tasks": [
    {"id":"D10101","agent":"devex","title":"Hello in 10 Minutes: chain init→run→doctor→format→run --yaml→build→package→ci plan",
      "allowedFiles":["docs/devex/first-five-minutes.md","docs/devex/quickstart.md","README.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10101_docs-hello-10m.patch"]},

    {"id":"D10102","agent":"devex","title":"Examples: finalize hello-calculator init path; acceptance notes",
      "allowedFiles":["examples/mk/init-templates/**","examples/mk/hello-calculator/**","tests/devex/acceptance/local-node-v1.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10102_examples-init-hello-final.patch"]},

    {"id":"D10103","agent":"devex","title":"CI plan doc: copy‑paste Actions snippet + cache keys; Laminar hooks",
      "allowedFiles":["docs/devex/ci-acceptance-smoke.md","README.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10103_docs-ci-plan-rc.patch"]},

    {"id":"D10104","agent":"devex","title":"Help snapshots: include mk init/build/package/ci; enforce style",
      "allowedFiles":["tests/cli/mkdxHelp.spec.ts","docs/devex/mk-dx-style.md"],
      "verify":["npm run build","npm run test:ci"],
      "deliverables":["patches/DIFF_D10104_cli-help-snapshots-rc.patch"]},

    {"id":"D10105","agent":"devex","title":"Release Notes (RC): features, install paths, limitations; link Distribution Matrix",
      "allowedFiles":["docs/devex/releases.md","README.md"],
      "verify":["npm run build"],
      "deliverables":["patches/DIFF_D10105_docs-release-notes-rc.patch"]}
  ]
}
````

```json
{
  "ampcode": "v1",
  "waves": [{ "id": "P18B-WS", "parallel": false, "tasks": ["D1801", "D1802", "D1803"] }],
  "branch": "mkolbol-net-p18b-ws-pipe",
  "tasks": [
    {
      "id": "D1801",
      "agent": "devex",
      "title": "WebSocketPipe: headless smoke + examples + docs",
      "allowedFiles": [
        "src/pipes/adapters/WebSocketPipe.ts",
        "tests/integration/wsPipe.spec.ts",
        "examples/network/ws-smoke/**",
        "docs/devex/network-quickstart.md"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_D1801_ws-pipe.patch"]
    },

    {
      "id": "D1802",
      "agent": "devex",
      "title": "mkctl notes: future --connect ws://... (doc placeholders only)",
      "allowedFiles": ["docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D1802_mkctl-ws-docs.patch"]
    },

    {
      "id": "D1803",
      "agent": "devex",
      "title": "Remote Host Setup (2nd machine) — quickstart",
      "allowedFiles": ["docs/devex/remote-host-setup.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D1803_remote-host-docs.patch"]
    }
  ]
}
```

Branch Instructions

- IMPORTANT: This sprint runs ONLY on branch `mkolbol-net-p18b-ws-pipe`.
- Do not change branches or merge; commit patches and logs as usual. The architect will handle PRs/merges.
- Use ephemeral WS ports 30012–30019 in tests to avoid collisions.
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

- First‑Five‑Minutes shows a single “Hello in 10 Minutes” path end‑to‑end.
- CI plan doc provides a working Actions snippet with Laminar hooks.
- Release Notes (RC) published; style/links consistent; help snapshots pass.

---

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "P17-DOCS-A_MK_ANYWHERE", "parallel": true, "tasks": ["D11001", "D11002", "D11004"] },
    {
      "id": "P17-DOCS-B_ROUTER_P2",
      "parallel": true,
      "depends_on": ["P17-DOCS-A_MK_ANYWHERE"],
      "tasks": ["D11003", "D11005"]
    }
  ],
  "tasks": [
    {
      "id": "D11001",
      "agent": "devex",
      "title": "Quickstart/README: mk self install + mk anywhere (no npm registry)",
      "allowedFiles": [
        "README.md",
        "docs/devex/first-five-minutes.md",
        "docs/devex/installation.md"
      ],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D11001_docs-mk-anywhere-quickstart.patch"]
    },

    {
      "id": "D11002",
      "agent": "devex",
      "title": "Tutorial: mk bootstrap out-of-tree app (Hello Calculator)",
      "allowedFiles": [
        "docs/devex/using-mkolbol-in-your-repo.md",
        "docs/devex/hello-calculator.md",
        "examples/mk/init-templates/**"
      ],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D11002_docs-bootstrap-tutorial.patch"]
    },

    {
      "id": "D11003",
      "agent": "devex",
      "title": "Doctor guide: toolchain/shim checks with exact remediation snippets",
      "allowedFiles": ["docs/devex/doctor.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D11003_docs-doctor-toolchain.patch"]
    },

    {
      "id": "D11004",
      "agent": "devex",
      "title": "CLI reference + help snapshots for self install/fetch/bootstrap",
      "allowedFiles": [
        "tests/cli/mkdxHelp.spec.ts",
        "docs/devex/mk-dx-style.md",
        "docs/devex/cli-reference.md"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_D11004_docs-help-snapshots-mk-anywhere.patch"]
    },

    {
      "id": "D11005",
      "agent": "devex",
      "title": "mkctl endpoints liveness: cookbook updates + watch examples",
      "allowedFiles": ["docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D11005_docs-mkctl-liveness.patch"]
    }
  ]
}
```

# DevEx — P17 Docs: mk Anywhere + Router Liveness

Intent

- Teach users how to install mk as a global shim, bootstrap out‑of‑tree apps, and observe endpoint liveness via mkctl.

Notes

- Keep distribution paths to tarball/git tag only; no npm registry references.
- Include explicit PATH instructions for POSIX and Windows; no auto‑mutation.
