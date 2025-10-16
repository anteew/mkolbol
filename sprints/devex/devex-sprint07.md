```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DX-A", "parallel": true,  "tasks": ["D9701", "D9702"] },
    { "id": "DX-B", "parallel": false, "depends_on": ["DX-A"], "tasks": ["D9703"] }
  ],
  "tasks": [
    {
      "id": "D9701",
      "agent": "devex",
      "title": "Onboarding v2: First Five Minutes 2.0",
      "allowedFiles": ["docs/devex/first-five-minutes.md", "README.md", "docs/devex/quickstart.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9701_onboarding-v2.patch"]
    },
    {
      "id": "D9702",
      "agent": "devex",
      "title": "Docs restructure: entry map + anchors",
      "allowedFiles": ["README.md", "docs/devex/wiring-and-tests.md", "docs/devex/stdio-path.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9702_docs-reflow.patch"]
    },
    {
      "id": "D9703",
      "agent": "devex",
      "title": "Examples sanity list + commands",
      "allowedFiles": ["examples/**", "docs/devex/quickstart.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9703_examples-sanity.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (DevEx Sprint 07)

Goal: Make the first visit frictionless with a one-screen overview, sharp anchors, working links, and verified examples.

Constraints
- Docs/examples only; no kernel changes.

Verification Commands
```bash
npm run build
```

