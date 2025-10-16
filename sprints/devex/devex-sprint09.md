```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DX-A", "parallel": true,  "tasks": ["D9901", "D9902"] }
  ],
  "tasks": [
    {
      "id": "D9901",
      "agent": "devex",
      "title": "Third‑Party Acceptance Pack v1 (templates)",
      "allowedFiles": ["tests/devex/README.md", "tests/devex/acceptance/**"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9901_acceptance-pack.patch"]
    },
    {
      "id": "D9902",
      "agent": "devex",
      "title": "Laminar usage guide for adopters",
      "allowedFiles": ["docs/devex/laminar-workflow.md", "README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9902_laminar-adopter-guide.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (DevEx Sprint 09)

Goal: Provide ready‑to‑adopt acceptance templates and Laminar documentation for third‑party servers.

Constraints
- Docs/templates only; no kernel/Executor changes.

Verification Commands
```bash
npm run build
```

