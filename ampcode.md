```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "MKD-P4-A",  "parallel": true,  "tasks": ["T9401","T9402","T9403"] },
    { "id": "MKD-P4-B",  "parallel": true,  "depends_on": ["MKD-P4-A"], "tasks": ["T9404","T9405"] }
  ],
  "tasks": [
    {"id": "T9401", "agent": "susan", "title": "mk init: scaffold minimal project (+tests, .mk/options)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/init.ts", "templates/init/**", "tests/cli/mkInit.spec.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9401_mk-init.patch"]},

    {"id": "T9402", "agent": "susan", "title": "mk build: bundle via esbuild + provenance metadata",
      "allowedFiles": ["scripts/mk.ts", "src/mk/build.ts", "package.json"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9402_mk-build.patch"]},

    {"id": "T9403", "agent": "susan", "title": "mk package: capsule v0 (unsigned, deterministic)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/package.ts", "tests/cli/mkPackage.spec.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9403_mk-package-capsule.patch"]},

    {"id": "T9404", "agent": "susan", "title": "mk ci plan: emit CI matrix + cache keys (Laminar hooks)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/ciPlan.ts", "docs/devex/ci-acceptance-smoke.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9404_mk-ci-plan.patch"]},

    {"id": "T9405", "agent": "susan", "title": "Did‑you‑mean suggestions for commands/flags (DX)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/errors.ts", "docs/devex/mk-dx-style.md", "tests/cli/mkdxHelp.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9405_mk-did-you-mean.patch"]}
  ]
}
```

# Ampcode — MKD RC Sweep: Acceptance + Release Prep

Goal
- Perform an end‑to‑end RC sweep to validate mk’s first‑run experience and release path; finalize any small UX gaps.

Constraints
- Bundle uses esbuild; capsule is unsigned (deterministic filename); CI plan mirrors local behavior and Laminar hooks.

Verification
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "MKD-RC-A",  "parallel": true,  "tasks": ["T9501","T9502"] },
    { "id": "MKD-RC-B",  "parallel": true,  "depends_on": ["MKD-RC-A"], "tasks": ["T9503","T9504","T9505"] }
  ],
  "tasks": [
    {"id": "T9501", "agent": "susan", "title": "Acceptance script: mk init → run → doctor → format → run --yaml (one-shot)",
      "allowedFiles": ["scripts/mk-acceptance.ts", "tests/devex/acceptance/local-node-v1.md", "package.json"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9501_mk-acceptance-script.patch"]},

    {"id": "T9502", "agent": "susan", "title": "CI smoke: mk init/build/package (non‑gating job)",
      "allowedFiles": [".github/workflows/tests.yml", "docs/devex/ci-acceptance-smoke.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9502_ci-mk-rc-smoke.patch"]},

    {"id": "T9503", "agent": "susan", "title": "mk build/package output polish (provenance path + friendly summary)",
      "allowedFiles": ["src/mk/build.ts", "src/mk/package.ts", "docs/devex/packaging.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9503_build-package-polish.patch"]},

    {"id": "T9504", "agent": "susan", "title": "mk ci plan: add --env output for export; doc examples",
      "allowedFiles": ["src/mk/ciPlan.ts", "tests/fixtures/mkdx/mk-ci-plan.help.txt", "docs/devex/ci-acceptance-smoke.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9504_ci-plan-env.patch"]},

    {"id": "T9505", "agent": "susan", "title": "Help snapshots & did‑you‑mean finalization",
      "allowedFiles": ["tests/cli/mkdxHelp.spec.ts", "docs/devex/mk-dx-style.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9505_help-snapshots-final.patch"]}
  ]
}
```
