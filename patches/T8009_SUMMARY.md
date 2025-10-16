# Task T8009: Feedback Hooks - Summary

## Task Overview

**Task ID**: T8009 (DevEx Sprint - FINAL TASK)
**Deliverable**: `patches/DIFF_DEVEX_T8009_feedback-hooks.patch`
**Status**: ✅ COMPLETE

## Objective

Provide issue templates and a CONTRIBUTING addendum focused on early-adopter feedback to enable structured, actionable feedback collection from users.

## Deliverables Created

### 1. Issue Templates

#### `.github/ISSUE_TEMPLATE/devex_bug.md` (153 lines)

A comprehensive bug report template that requests:
- Clear bug description with steps to reproduce
- Expected vs. actual behavior
- Environment details (OS, Node.js, npm versions, mkolbol version)
- Reproducible example (GitHub repo OR inline code)
- Failing command(s) with full output
- Logs and artifacts:
  - Error messages (full stack traces)
  - Laminar reports (summary, per-case logs, digests)
  - Terminal output (stderr/stdout)
  - Reports directory structure
- Additional context (Laminar usage, process mode, CI vs local, etc.)
- Checklist confirming user read docs and provided required info

**Key Features**:
- Two repro options: GitHub repo (preferred) or inline snippet
- Detailed log attachment guidance for Laminar users
- Collapsible sections for terminal output to keep issues clean
- Links to Early Adopter Guide and Quickstart

#### `.github/ISSUE_TEMPLATE/devex_request.md` (135 lines)

A structured feature request template that captures:
- Feature summary (one-sentence)
- Motivation (problem statement, use case, impact)
- Proposed solution (API/interface, configuration, behavior)
- Alternatives considered (with pros/cons)
- Pain point addressed (DX, performance, debugging, testing, docs, etc.)
- Related documentation/RFCs
- Related issues (dependencies, blockers)
- Implementation considerations (complexity, challenges, breaking changes)
- Example workflow showing how the feature would be used
- Benefits summary
- Checklist confirming research and documentation review

**Key Features**:
- Focus on "why" over "what" (motivation-driven)
- Pain point categorization (8 categories)
- Breaking change awareness
- Links to relevant RFCs and docs

### 2. Contributing Guide

#### `CONTRIBUTING-DEVEX.md` (713 lines, ~20KB)

A comprehensive early adopter contributing guide with 7 major sections:

1. **For Early Adopters** (60 lines)
   - What we're looking for (bug reports, features, docs gaps, integration challenges)
   - How to get started (read guide → quickstart → try demos → report)
   - What makes good feedback (specific, reproducible, contextual, constructive)
   - Examples of good vs. bad feedback

2. **Sharing Minimal Repros** (165 lines)
   - When to create a GitHub repo vs. inline example
   - Template for minimal repo structure
   - Step-by-step guide to creating a repro repo
   - What to include (code, config, commands)
   - How to make it minimal (5-step reduction process)
   - Before/after examples showing 50+ lines → 10 lines

3. **Which Logs to Attach** (172 lines)
   - Reports directory overview
   - 5 types of artifacts to attach:
     1. Summary output (reports/summary.jsonl)
     2. Per-case logs (reports/<suite>/<case>.jsonl)
     3. Terminal output (full stderr/stdout)
     4. Laminar digest (reports/<suite>/<case>.digest.json)
     5. System info (Node, npm, OS versions)
   - Complete log attachment example
   - How to attach files to GitHub issues (drag-and-drop, gists, compression)

4. **Best Practices** (86 lines)
   - Use code blocks, not screenshots
   - Include full error messages (stack traces)
   - Tag issues appropriately (devex, bug, feature-request, docs)
   - Link related issues (Related to #X, Depends on #Y, Fixes #Z)
   - Provide context (what, expected, actual, tried)

5. **Getting Help** (47 lines)
   - GitHub Discussions (Q&A, Show and Tell, Ideas)
   - FAQ and documentation links
   - Discord/Slack status (not yet available)
   - Direct issue filing criteria

6. **Code Review Process** (70 lines)
   - Review timeline expectations (1-3 days initial, 3-7 days first review)
   - What reviewers look for (correctness, tests, docs, style, breaking changes)
   - How contributions are reviewed (CI → code review → discussion → approval)
   - Tips for faster reviews (small PRs, clear commits, tests, link issues)
   - Example PR description
   - How to follow up

7. **Issue Template Checklist** (93 lines)
   - When to use devex_bug.md vs. devex_request.md
   - Required vs. optional fields for each template
   - Checklist items breakdown
   - Decision tree for template selection

**Key Features**:
- Extremely detailed (3-5 pages as requested)
- Actionable guidance with concrete examples
- Laminar-aware (integrates test observability workflows)
- Structured with clear headings and table of contents
- Includes "Do/Don't" tips and "Remember" callouts
- Links to all relevant docs (Early Adopter Guide, Quickstart, Laminar Workflow, RFCs)

### 3. Patch File

#### `patches/DIFF_DEVEX_T8009_feedback-hooks.patch` (1,019 lines, 28KB)

Complete Git diff with:
- 3 files added: devex_bug.md, devex_request.md, CONTRIBUTING-DEVEX.md
- 1,001 lines inserted
- Ready to apply with: `git apply patches/DIFF_DEVEX_T8009_feedback-hooks.patch`

## Success Criteria Verification

✅ **Templates ask for repo link, failing command, logs/artifacts pointers**
- devex_bug.md has dedicated sections for each

✅ **CONTRIBUTING-DEVEX explains how to share minimal repros**
- 165-line section with step-by-step guide and before/after examples

✅ **CONTRIBUTING-DEVEX explains which logs to attach**
- 172-line section covering all Laminar artifacts (summary, per-case logs, digests, terminal output, system info)

✅ **We receive structured, actionable feedback from early adopters**
- Templates enforce required fields with checklists
- CONTRIBUTING-DEVEX provides clear guidance to reduce back-and-forth
- Both templates link to docs to self-service common questions

## Design Decisions

### 1. Two-Option Repro Strategy

**Decision**: Offer GitHub repo (preferred) OR inline snippet
**Rationale**: Balances comprehensiveness (repo) with low friction (inline) for simple bugs

### 2. Laminar-First Log Guidance

**Decision**: Assume users are using Laminar and provide detailed artifact guidance
**Rationale**: mkolbol uses Laminar for test observability; early adopters likely run tests

### 3. Mandatory Checklist Items

**Decision**: Require users to confirm they read docs before filing
**Rationale**: Reduces duplicate issues and self-service issues that could be resolved with docs

### 4. Pain Point Categorization

**Decision**: Feature request template includes 8 pain point categories
**Rationale**: Helps maintainers prioritize based on impact (DX, performance, debugging, etc.)

### 5. Comprehensive CONTRIBUTING Guide

**Decision**: 713 lines (vs. typical 200-300 line guides)
**Rationale**: Early adopters need extra hand-holding; better to over-document than under-document

## File Locations

All files are created at the correct locations:

```
/srv/repos0/mkolbol/
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── devex_bug.md           (3.6 KB, 153 lines)
│       └── devex_request.md       (3.3 KB, 135 lines)
├── CONTRIBUTING-DEVEX.md          (20 KB, 713 lines)
└── patches/
    ├── DIFF_DEVEX_T8009_feedback-hooks.patch  (28 KB, 1,019 lines)
    └── T8009_SUMMARY.md           (this file)
```

## Integration Points

### Links to Existing Documentation

All files link to:
- [Early Adopter Guide](docs/devex/early-adopter-guide.md)
- [Quickstart](README.md#quickstart)
- [Laminar Workflow Guide](docs/devex/laminar-workflow.md)
- [Stream Kernel RFC](docs/rfcs/stream-kernel/00-index.md)
- [Testing CI Guide](docs/testing/ci.md)
- [Process Mode CI](docs/testing/process-mode-ci.md)

### Laminar Workflows Referenced

- `npx lam summary` - View test summary
- `npx lam digest` - Generate failure digests
- `npx lam show --case <name>` - Inspect specific test
- `npx lam trends` - Track failure trends
- `npx lam repro` - Get reproduction commands

### GitHub Issue Workflow

1. User encounters bug → chooses devex_bug.md template
2. Template guides them to provide:
   - Minimal repro (repo or inline)
   - Environment details
   - Full logs (Laminar + terminal output)
   - Checklist confirmation
3. Maintainer receives structured issue with all needed info
4. Faster resolution due to actionable data

## Next Steps (Optional)

After this task is complete, consider:

1. **Add template config**: `.github/ISSUE_TEMPLATE/config.yml` to customize issue creation page
2. **Link in README**: Add "Contributing" section linking to CONTRIBUTING-DEVEX.md
3. **CI template check**: Add GitHub Action to verify issues use templates
4. **Auto-labeling**: Add GitHub Action to auto-label issues based on template used
5. **Issue triage guide**: Add docs/devex/issue-triage.md for maintainers

## Notes

- No kernel code was modified (as instructed)
- All files follow project conventions (Markdown, no emojis in templates)
- Templates use GitHub issue template YAML frontmatter format
- CONTRIBUTING-DEVEX.md is standalone (doesn't replace main CONTRIBUTING.md if one exists)
- Patch is ready to apply without conflicts

---

**Task T8009: COMPLETE** ✅

All deliverables created successfully. Patch file ready for review and application.
