```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DX-10A", "parallel": true,  "tasks": ["LAM-1001", "LAM-1002", "LAM-1003", "LAM-1004"] },
    { "id": "DX-10B", "parallel": true,  "tasks": ["DEVEX-101", "DEVEX-102", "DEVEX-103"] }
  ],
  "tasks": [
    {
      "id": "LAM-1001",
      "agent": "devex",
      "title": "Laminar trends cache (persist history across CI runs)",
      "allowedFiles": [".github/workflows/tests.yml", "VEGA/laminar-ci-visibility-plan.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_LAM-1001_trends-cache.patch"]
    },
    {
      "id": "LAM-1002",
      "agent": "devex",
      "title": "Suite tagging per lane (threads/forks/process-unix)",
      "allowedFiles": [".github/workflows/tests.yml"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_LAM-1002_suite-tags.patch"]
    },
    {
      "id": "LAM-1003",
      "agent": "devex",
      "title": "PR comment with Laminar summary + top trends (best-effort)",
      "allowedFiles": [".github/workflows/tests.yml", "package.json", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_LAM-1003_pr-comment.patch"]
    },
    {
      "id": "LAM-1004",
      "agent": "devex",
      "title": "Repro hints artifact (LAMINAR_REPRO.md) for failures",
      "allowedFiles": [".github/workflows/tests.yml", "reports/**"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_LAM-1004_repro-hints.patch"]
    },
    {
      "id": "DEVEX-101",
      "agent": "devex",
      "title": "Quickstart update: prefer FilesystemSink (http-logs-local-file.yml)",
      "allowedFiles": ["examples/configs/http-logs-local-file.yml", "docs/devex/quickstart.md", "docs/devex/mkctl-cookbook.md", "tests/devex/acceptance/local-node-v1.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-101_filesink-quickstart.patch"]
    },
    {
      "id": "DEVEX-102",
      "agent": "devex",
      "title": "First Five Minutes landing (Local Node) + troubleshooting",
      "allowedFiles": ["README.md", "docs/devex/quickstart.md", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-102_first-five-minutes.patch"]
    },
    {
      "id": "DEVEX-103",
      "agent": "devex",
      "title": "mkctl docs polish: error matrix + exit codes",
      "allowedFiles": ["docs/devex/mkctl-cookbook.md", "docs/devex/quickstart.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_DEVEX-103_mkctl-docs-polish.patch"]
    }
  ]
}
```

# DevEx Sprint 10 — Laminar CI Visibility + Local Node Developer Experience

Goal
- Elevate CI insight with Laminar (trends, suite tags, PR comments, repro hints) and refine early-adopter experience (FileSink-first quickstart, first-five-minutes, mkctl docs polish).

Constraints
- Local Node only (`MK_LOCAL_NODE=1`); no network adapters. CI changes should be best-effort where appropriate to avoid blocking merges on comment posting.

Execution Notes for Vex
- Autonomy: In addition to DevEx, you now own “Laminar and test strategy improvements”. You may run mini-sprints inside this sprint. Create `Vex/minisprints/vex-sprint10-ms1.md` (use agent_template/AMPCODE_TEMPLATE.md) and append progress to `Vex/devex.log`.
- Scope management: Maximize what you can deliver per mini-sprint without compromising quality. If tradeoffs arise, leave a concise note in ampcode.log for the architect (VEGA) and ping Danny with questions.
- Planning runway: Propose a rolling 2–3 sprint Laminar roadmap (flake budgets, dashboards, diffing), but only land items gated by Local Node v1.0.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
# Laminar best-effort reports (locally):
npm run lam -- summary || true
npm run lam -- trends --top 10 || true
```

Success Criteria
- CI caches `reports/history.jsonl`; suite-tagged runs visible in Laminar summaries.
- PRs include a short Laminar summary/trends comment when actions permissions permit.
- Quickstart prefers FilesystemSink variant and acceptance doc references it.
- mkctl docs include an error matrix and exit code mapping.

Communication
- Use ampcode.log for status and questions. Danny will route between you and VEGA.
- If you need input on testing strategy priorities, propose options and proceed with the highest impact minimal change.
