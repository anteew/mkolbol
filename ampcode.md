```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "MKD-P1-A",  "parallel": true,  "tasks": ["T9001","T9002","T9003","T9004"] },
    { "id": "MKD-P1-B",  "parallel": true,  "depends_on": ["MKD-P1-A"], "tasks": ["T9005","T9006","T9007"] },
    { "id": "MKD-P1-C",  "parallel": false, "depends_on": ["MKD-P1-B"], "tasks": ["T9008","T9009"] }
  ],
  "tasks": [
    {"id": "T9001", "agent": "susan", "title": "mk CLI skeleton (init/run/doctor/graph/format/prompt)",
      "allowedFiles": ["scripts/mk.ts","package.json","vitest.config.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9001_mk-cli-skeleton.patch"]},

    {"id": "T9002", "agent": "susan", "title": "Format adapters + flags (--yaml, --yaml-in/out, --format)",
      "allowedFiles": ["scripts/mk.ts","src/mk/format.ts","package.json","docs/rfcs/MK_DEV_ORCHESTRATOR_RFC_v0.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9002_mk-format-adapters.patch"]},

    {"id": "T9003", "agent": "susan", "title": ".mk/options.json loader (profiles + precedence)",
      "allowedFiles": ["src/mk/options.ts","scripts/mk.ts","schemas/mk-options.v0.json"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9003_mk-options-loader.patch"]},

    {"id": "T9004", "agent": "susan", "title": "Prompt snippet print/off + state under .mk/state/",
      "allowedFiles": ["src/mk/prompt.ts","scripts/mk.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9004_mk-prompt.patch"]},

    {"id": "T9005", "agent": "susan", "title": "mk run --dry-run → kernel loader validation + error mapping",
      "allowedFiles": ["scripts/mk.ts","src/config/loader.ts","src/mk/errors.ts","tests/cli/mkRunDry.spec.ts"],
      "verify": ["npm run build","npm run test:ci"],
      "deliverables": ["patches/DIFF_T9005_mk-run-dry.patch"]},

    {"id": "T9006", "agent": "susan", "title": "mk graph (ASCII + --json) from normalized topology",
      "allowedFiles": ["src/mk/graph.ts","scripts/mk.ts","tests/cli/mkGraph.spec.ts"],
      "verify": ["npm run build","npm run test:ci"],
      "deliverables": ["patches/DIFF_T9006_mk-graph.patch"]},

    {"id": "T9007", "agent": "susan", "title": "Canonical error microcopy + --json payload (code/message/remediation)",
      "allowedFiles": ["src/mk/errors.ts","scripts/mk.ts","tests/cli/mkdxErrors.spec.ts"],
      "verify": ["npm run build","npm run test:ci"],
      "deliverables": ["patches/DIFF_T9007_mk-errors-microcopy.patch"]},

    {"id": "T9008", "agent": "susan", "title": "mk doctor (stub) with environment checks + remediations",
      "allowedFiles": ["scripts/mk.ts","src/mk/doctor.ts","docs/devex/doctor.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9008_mk-doctor-stub.patch"]},

    {"id": "T9009", "agent": "susan", "title": "Unskip mkdx help/error snapshot tests; stabilize",
      "allowedFiles": ["tests/cli/mkdxHelp.spec.ts","tests/cli/mkdxErrors.spec.ts"],
      "verify": ["npm run build","npm run test:ci"],
      "deliverables": ["patches/DIFF_T9009_mkdx-tests-enable.patch"]}
  ]
}
```

# Ampcode — MK Dev Orchestrator Phase A (Core CLI + Format + Options + Prompt)

Goal
- Deliver the developer‑joy golden path for mk: CLI skeleton, JSON⇄YAML adapters, per‑repo options, prompt snippet, `run --dry-run`, `graph`, canonical errors.

Constraints
- `MK_LOCAL_NODE=1` (no cross‑host features). Reuse the kernel Topology loader; no kernel changes.
- JSON is the canonical in‑memory format; YAML is I/O only.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```

