# T4504: Docs: npm install/npx usage + bin guidance

## Changes Made

### README.md
1. **Quickstart Section**:
   - Updated install comment to "Install locally in your project"
   - Changed all command examples to use `npx lam` prefix
   - Updated Basic Commands table to use `npx lam` syntax

2. **Installation Section** (reorganized):
   - Added "Local Installation (Recommended)" subsection with npx usage examples
   - Added "Global Installation" subsection with direct lam command usage
   - Added "npx Usage (No Installation Required)" subsection
   - Added comprehensive "Troubleshooting" subsection with:
     - Command not found solutions
     - npx hanging/prompting fixes
     - Version cache issues
   - Moved requirements to bottom of section

### docs/testing/laminar.md
1. **Quickstart Section**:
   - Updated install comment to "Install locally in your project (recommended)"
   - Added "Alternative: Using npx without installation" example
   - Added "Global installation option" example
   
2. **Basic Commands Table**:
   - Updated all commands to use `npx lam` prefix
   - Added "Example" column with practical command examples
   - Added "Usage Notes" section clarifying:
     - Local install: Use `npx lam` prefix
     - Global install: Use `lam` directly
     - No install: Use `npx mkolbol lam` prefix

## Verification

✓ `npx lam` usage documented throughout README.md (16 occurrences)
✓ `npx lam` usage documented throughout docs/testing/laminar.md (10+ occurrences)
✓ Installation troubleshooting added
✓ Global vs local vs npx usage clearly differentiated

## Files Modified
- README.md
- docs/testing/laminar.md

## Deliverable
- patches/DIFF_T4504_docs-npm-usage.patch
