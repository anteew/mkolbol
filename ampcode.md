```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "A", "parallel": true, "tasks": ["T8001", "T8002"] },
    { "id": "B", "parallel": false, "depends_on": ["A"], "tasks": ["T8003", "T8004"] },
    { "id": "C", "parallel": true, "depends_on": ["B"], "tasks": ["T8005", "T8006", "T8007"] },
    { "id": "D", "parallel": false, "depends_on": ["C"], "tasks": ["T8008", "T8009"] }
  ],
  "tasks": [
    { "id": "T8001", "agent": "devex", "title": "Early Adopter Guide (First 5 Minutes)", "deliverables": ["patches/DIFF_DEVEX_T8001_early-adopter-guide.patch"] },
    { "id": "T8002", "agent": "devex", "title": "Quickstart: Run a Minimal Topology", "deliverables": ["patches/DIFF_DEVEX_T8002_quickstart-topology.patch"] },
    { "id": "T8003", "agent": "devex", "title": "Write Your First Server (Tutorial)", "deliverables": ["patches/DIFF_DEVEX_T8003_first-server-tutorial.patch"] },
    { "id": "T8004", "agent": "devex", "title": "Wire-Up & Test: Config + CI", "deliverables": ["patches/DIFF_DEVEX_T8004_wire-and-test.patch"] },
    { "id": "T8005", "agent": "devex", "title": "Packaging Prototype (Single Runner)", "deliverables": ["patches/DIFF_DEVEX_T8005_packaging-prototype.patch"] },
    { "id": "T8006", "agent": "devex", "title": "Third‑Party Server Acceptance Suite", "deliverables": ["patches/DIFF_DEVEX_T8006_acceptance-suite.patch"] },
    { "id": "T8007", "agent": "devex", "title": "Laminar Dev Workflow for Early Adopters", "deliverables": ["patches/DIFF_DEVEX_T8007_laminar-dev-workflow.patch"] },
    { "id": "T8008", "agent": "devex", "title": "Scaffolder RFC: mkolbol init", "deliverables": ["patches/DIFF_DEVEX_T8008_scaffolder-rfc.patch"] },
    { "id": "T8009", "agent": "devex", "title": "DX Issue Templates + Feedback Hooks", "deliverables": ["patches/DIFF_DEVEX_T8009_feedback-hooks.patch"] }
  ]
}
```

# Sprint — SB-DEVEX-EARLY-ADOPTER-P1

Architect: VEGA
Role: Developer Experience (external early adopter focus)
Reporting: Append results to ampcode.log and place diffs under patches/ as listed.

Context & Scope
Goal: Enable a third‑party developer to (1) understand mkolbol’s model, (2) run a minimal topology locally, (3) author a simple server, (4) wire and test it, and (5) produce a distributable runner — all without changing the kernel.

Constraints
- No kernel changes; scope limited to docs, examples, simple tooling, tests.
- Keep CI green on Node 20/24; process‑mode enforcement remains required.
- Deterministic tests; avoid long sleeps and flakiness.

Prerequisites
- Node 20 or 24; npm.
- Local runs may use lam (Laminar) but publishing is not required; use GitHub install method if needed.

Waves
- A (parallel): T8001, T8002
- B (after A): T8003, T8004
- C (parallel after B): T8005, T8006, T8007
- D (after C): T8008, T8009

Tasks (abridged)
- T8001 Early Adopter Guide (First 5 Minutes): docs/devex/early-adopter-guide.md; link from README.
- T8002 Quickstart: run PTY → XtermTTYRenderer: docs/devex/quickstart.md; link from README.
- T8003 First Server Tutorial: docs/devex/first-server-tutorial.md + examples/early-adopter skeleton (docs only).
- T8004 Wiring & Tests: docs/devex/wiring-and-tests.md + tests/devex/server-acceptance.spec.ts (skeleton).
- T8005 Packaging Prototype: docs/devex/packaging.md + sample bundler script under examples/early-adopter/.
- T8006 Acceptance Suite: tests/devex/acceptance/*.spec.ts (copy‑friendly templates).
- T8007 Laminar Workflow: docs/devex/laminar-workflow.md; README link.
- T8008 Scaffolder RFC: docs/devex/rfcs/0001-mkolbol-init.md.
- T8009 DX Issue Templates + Feedback Hooks: .github/ISSUE_TEMPLATE/* and CONTRIBUTING-DEVEX.md.

Quality Bar
- Diffs compile and tests remain green (threads/forks lanes).
- Changes are minimal and scoped to allowed files; no kernel edits.
- Docs are copy‑pasteable; commands verified locally by the agent.
- Any added tests are deterministic and complete in < 30s total across lanes.

Reporting Format
Follow agent_template/AMPCODE_TEMPLATE.md and aggregate results to ampcode.log. Include links to:
- reports/summary.jsonl, reports/*_raw.log (if produced)
- New docs under docs/devex/
