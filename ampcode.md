```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "MKD-P2-A",  "parallel": true,  "tasks": ["T9101","T9102","T9104"] },
    { "id": "MKD-P2-B",  "parallel": true,  "depends_on": ["MKD-P2-A"], "tasks": ["T9103","T9105"] }
  ],
  "tasks": [
    {"id": "T9101", "agent": "susan", "title": "Release pack (npm pack) + minimal files set",
      "allowedFiles": ["package.json", ".npmignore", ".github/workflows/release.yml"],
      "verify": ["npm run build", "npm pack"],
      "deliverables": ["patches/DIFF_T9101_release-pack.patch"]},

    {"id": "T9102", "agent": "susan", "title": "Release CI: tag→build→pack→attach .tgz to GitHub Release",
      "allowedFiles": [".github/workflows/release.yml"],
      "verify": ["true"],
      "deliverables": ["patches/DIFF_T9102_release-ci.patch"]},

    {"id": "T9104", "agent": "susan", "title": "Packaging knobs: bin entries + postinstall/prepare guards",
      "allowedFiles": ["package.json"],
      "verify": ["npm pack"],
      "deliverables": ["patches/DIFF_T9104_packaging-knobs.patch"]},

    {"id": "T9103", "agent": "susan", "title": "Consumer acceptance: fixture app installs from local .tgz",
      "allowedFiles": ["tests/consumer/fixture-app/**", ".github/workflows/tests.yml", "scripts/test-consumer.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9103_consumer-acceptance.patch"]},

    {"id": "T9105", "agent": "susan", "title": "mk fetch (experimental): download and install release tarball by tag",
      "allowedFiles": ["scripts/mk.ts", "src/mk/fetch.ts", "docs/devex/packaging.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9105_mk-fetch.patch"]}
  ]
}
```

# Ampcode — MKD Phase B: No‑Registry Distribution (Tarball‑first)

Goal
- Enable installing mkolbol without npm registry: tarball‑first distribution, Git tag pinning, and vendor path, with CI release artifacts and a consumer acceptance test.

Constraints
- Do not publish to npm. Prefer GitHub Releases artifacts (.tgz) and documented Git/tag installs.

Notes for Susan
- Tarball must contain dist/, types, bins (mk, mkctl), README, LICENSE; no dev files, tests, or node_modules.
- Guard prepare/postinstall so consumer installs have no side effects.
- Consumer fixture installs from freshly built .tgz and runs a tiny topology (TTYRenderer + FilesystemSink) as the acceptance proof.

Verification
```bash
export MK_LOCAL_NODE=1
npm run build
npm pack
```
