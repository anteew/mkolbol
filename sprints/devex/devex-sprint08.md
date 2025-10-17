```json
{
  "ampcode": "v1",
  "waves": [{ "id": "DX-A", "parallel": false, "tasks": ["D9801"] }],
  "tasks": [
    {
      "id": "D9801",
      "agent": "devex",
      "title": "mkctl Validate + Doctor (error matrix end-to-end)",
      "allowedFiles": [
        "docs/devex/troubleshooting.md",
        "docs/devex/mkctl-cookbook.md",
        "examples/configs/**"
      ],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9801_mkctl-validate-doctor.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (DevEx Sprint 08)

Goal: Expand error→cause→fix mapping and ensure mkctl messages match docs with runnable bad-config fixtures.

Constraints

- Docs/fixtures only; no core behavior changes.

Verification Commands

```bash
npm run build
```
