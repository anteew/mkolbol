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

# Ampcode — MKD Phase D: Build/Package/CI Plan (RC)

Goal
- Reach RFC v0 RC: `mk init`, `mk build`, `mk package` (capsule v0), and `mk ci plan` complete; add “did‑you‑mean” polish.

Constraints
- Bundle uses esbuild; capsule is unsigned (deterministic filename); CI plan mirrors local behavior and Laminar hooks.

Verification
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```
