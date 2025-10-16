```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DX-9A", "parallel": true, "tasks": ["D9901", "D9902"] }
  ],
  "tasks": [
    {
      "id": "D9901",
      "agent": "devex",
      "title": "Acceptance Pack v1 (Local Node): templates + guide",
      "allowedFiles": ["tests/devex/acceptance/**", "tests/devex/README.md", "docs/devex/early-adopter-guide.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9901_acceptance-pack.patch"]
    },
    {
      "id": "D9902",
      "agent": "devex",
      "title": "Local Node Quickstart: http-logs-local demo",
      "allowedFiles": ["examples/configs/http-logs-local.yml", "docs/devex/quickstart.md", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9902_local-quickstart.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (DevEx Sprint 09)

Goal: Ship a Local Node acceptance pack and a one-command quickstart (http→FilesystemSink) that dogfoods Router P2.

Constraints
- Docs/templates/examples only; no core changes.

Verification Commands
```bash
npm run build
```
