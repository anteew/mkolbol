```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "DX-A", "parallel": true,  "tasks": ["D9701", "D9702"] },
    { "id": "DX-B", "parallel": false, "depends_on": ["DX-A"], "tasks": ["D9703", "D9704"] },
    { "id": "DX-C", "parallel": false, "depends_on": ["DX-B"], "tasks": ["D9705"] }
  ],
  "tasks": [
    {
      "id": "D9701",
      "agent": "devex",
      "title": "First Five Minutes landing (template-aligned)",
      "allowedFiles": ["docs/devex/first-five-minutes.md", "README.md", "docs/devex/quickstart.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9701_first-five-minutes.patch"]
    },
    {
      "id": "D9702",
      "agent": "devex",
      "title": "Troubleshooting guide + mkctl error matrix",
      "allowedFiles": ["docs/devex/troubleshooting.md", "README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9702_troubleshooting-matrix.patch"]
    },
    {
      "id": "D9703",
      "agent": "devex",
      "title": "Packaging via GitHub install (no npm publish)",
      "allowedFiles": ["docs/devex/early-adopter-guide.md", "examples/early-adopter/scripts/build-bundle.mjs", "examples/early-adopter/README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9703_github-packaging.patch"]
    },
    {
      "id": "D9704",
      "agent": "devex",
      "title": "mkctl Cookbook (run, endpoints, tail logs)",
      "allowedFiles": ["docs/devex/mkctl-cookbook.md", "README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9704_mkctl-cookbook.patch"]
    },
    {
      "id": "D9705",
      "agent": "devex",
      "title": "Early-adopter acceptance templates (golden + CI doc)",
      "allowedFiles": ["tests/devex/README.md", "tests/devex/templates/acceptance.example.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D9705_acceptance-templates.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (DevEx)

**Architect**: VEGA  
**Sprint/Batch**: DEVEX-P6  
**Reporting**: Append results to `ampcode.log` and place unified diffs in `patches/`.

---

## Context & Scope

**Goal**: Smooth “first five minutes” for early adopters, with clear troubleshooting and packaging guidance using GitHub install (no npm publish).

**Constraints**:

- [ ] Docs-only + scripts; no kernel changes
- [ ] Keep links and commands reproducible on Node 20/24

**Prerequisites**:
- None beyond repo standard setup (`npm ci`)

---

## Execution Waves

```yaml
waves:
  - id: DX-A
    parallel: true
    tasks: [D9701, D9702]

  - id: DX-B
    parallel: false
    depends_on: [DX-A]
    tasks: [D9703, D9704]

  - id: DX-C
    parallel: false
    depends_on: [DX-B]
    tasks: [D9705]
```

---

## Tasks

### TASK D9701 — First Five Minutes landing (template-aligned)
**Goal**: Provide a concise landing page that routes to mkctl run, StdIO path, or Interactive path.
**Allowed Files**:
```yaml
modify:
  - README.md # link prominently
create:
  - docs/devex/first-five-minutes.md # landing content
  - docs/devex/quickstart.md # ensure alignment
```
**Requirements**:
1. One-screen overview and 3-path chooser.
2. Verified links to quickstart and interactive docs.
**Deliverable**: `patches/DIFF_D9701_first-five-minutes.patch`

---

### TASK D9702 — Troubleshooting guide + mkctl error matrix
**Goal**: Map common mkctl errors to fixes with examples; align with CLI messages.
**Allowed Files**:
```yaml
modify:
  - docs/devex/troubleshooting.md
  - README.md # link
```
**Requirements**:
1. Include error → cause → fix table for: file not found, invalid YAML, invalid topology, runtime errors.
2. Show reproduction commands and expected exit codes.
**Deliverable**: `patches/DIFF_D9702_troubleshooting-matrix.patch`

---

### TASK D9703 — Packaging via GitHub install (no npm publish)
**Goal**: Document and script a GitHub-based install and packaging path.
**Allowed Files**:
```yaml
modify:
  - docs/devex/early-adopter-guide.md # packaging section
  - examples/early-adopter/README.md # usage notes
  - examples/early-adopter/scripts/build-bundle.mjs # small tweaks if needed
```
**Requirements**:
1. End-to-end steps to build and run a bundled runner using GitHub dependency.
2. Note Laminar artifacts and where to find them in reports/.
**Deliverable**: `patches/DIFF_D9703_github-packaging.patch`

---

### TASK D9704 — mkctl Cookbook (run, endpoints, tail logs)
**Goal**: Provide command cookbook with short examples.
**Allowed Files**:
```yaml
create:
  - docs/devex/mkctl-cookbook.md
modify:
  - README.md # link in CLI section
```
**Requirements**:
1. Examples for run, endpoints, duration, error cases, and raw log locations.
**Deliverable**: `patches/DIFF_D9704_mkctl-cookbook.patch`

---

### TASK D9705 — Early-adopter acceptance templates (golden + CI doc)
**Goal**: Provide acceptance test templates and CI docs for third-party servers.
**Allowed Files**:
```yaml
create:
  - tests/devex/templates/acceptance.example.md # template
modify:
  - tests/devex/README.md # how to adopt
```
**Requirements**:
1. Template outlines golden transcripts and Laminar report pointers.
2. CI recipe with vitest + Laminar reporter usage.
**Deliverable**: `patches/DIFF_D9705_acceptance-templates.patch`

---

## Quality Bar

**Non-negotiable**:
- [ ] Docs compile (links resolve); tests unaffected
- [ ] Examples match current CLI and scripts
- [ ] Reports pointers included

## Reporting Format

Follow AMPCODE_TEMPLATE.md “Reporting Format”; append results to `ampcode.log` with deliverables and verification status.

