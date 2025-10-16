```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DX-A", "parallel": false, "tasks": ["D1101", "D1102"] }
  ],
  "tasks": [
    {
      "id": "D1101",
      "agent": "devex",
      "title": "mkctl init (docs-first; gated CLI optional)",
      "allowedFiles": ["docs/devex/mkctl-init.md", "README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D1101_mkctl-init-docs.patch"]
    },
    {
      "id": "D1102",
      "agent": "devex",
      "title": "Scaffolded acceptance template + GH Actions sample",
      "allowedFiles": ["tests/devex/templates/**", "tests/devex/README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D1102_scaffold-templates.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (DevEx Sprint 11)

Goal: Enable zero-to-hello-server with scaffolded files; CLI scaffolder is optional and gated (MK_DEVEX_INIT=1).

Constraints
- No kernel changes; any CLI addition must be gated.

Verification Commands
```bash
npm run build
```

