# T9105: mk fetch Command - Summary

## Overview

Created `mk fetch` command to download and install mkolbol release tarballs by tag from GitHub releases.

## Implementation

### 1. src/mk/fetch.ts (New File)

Core functionality module with two public functions:

**`downloadRelease(tag: string): Promise<string>`**
- Queries GitHub Releases API for specified tag
- Supports special "latest" tag to fetch most recent release
- Downloads `.tgz` asset to current working directory
- Returns path to downloaded tarball
- Error handling for missing releases and network failures

**`installTarball(path: string): Promise<void>`**
- Validates tarball exists and is readable
- Executes `npm install <tarball>` via child_process
- Updates package.json and package-lock.json
- Inherits stdio for npm output visibility

**Internal functions:**
- `getReleaseTarballUrl(tag)`: Resolves tag to tarball URL
- `getLatestReleaseTag()`: Fetches latest release tag from GitHub
- `downloadFile(url, path)`: HTTP download with redirect handling

### 2. scripts/mk.ts

Added new command to CLI:

```typescript
{
  name: 'fetch',
  description: 'Download and install release tarball by tag (experimental)',
  usage: 'mk fetch <tag>',
  handler: async (args: string[]) => {
    // Validates args, imports fetch module, downloads and installs
  }
}
```

### 3. docs/devex/packaging.md

Updated documentation with three new sections:

**Table of Contents**
- Added navigation links to major sections

**Tarball Installation**
- npm install from local/remote tarball
- `mk fetch` usage and examples
- Workflow explanation
- Limitations (experimental, requires GitHub, no pre-releases)

**Git Tag Pinning**
- Pin to tag, commit SHA, or branch
- Pros/cons comparison
- When to use (dev, CI/CD, testing)
- npm git protocol examples

## Usage Examples

```bash
# Install specific version
mk fetch v0.2.0

# Install latest release
mk fetch latest

# Error: missing tag
mk fetch
# Error: Missing release tag
# Usage: mk fetch <tag>
# Examples: mk fetch v0.2.0, mk fetch latest
```

## Technical Details

**HTTP Client**: Node.js https module (no external dependencies)
**API**: GitHub REST API v3
  - `/repos/:owner/:repo/releases/tags/:tag`
  - `/repos/:owner/:repo/releases/latest`
**Install Method**: `npm install <tarball>` via execSync
**Download Location**: `process.cwd()` (current directory)

## Error Handling

- Missing tag argument (EXIT_USAGE)
- Release not found (404)
- GitHub API errors
- Network failures
- Tarball read permissions
- npm install failures

## Limitations

1. **Experimental**: API may change
2. **GitHub only**: Requires connection to GitHub
3. **No auth**: Rate-limited to 60 requests/hour
4. **No pre-releases**: Only works with published releases
5. **No cleanup**: Downloaded tarball remains in current directory

## Verification

Build passes:
```bash
npm run build
# ✓ TypeScript compilation successful
```

## Files Changed

- **src/mk/fetch.ts** (created, 154 lines)
- **scripts/mk.ts** (+29 lines)
- **docs/devex/packaging.md** (+126 lines)
- **patches/DIFF_T9105_mk-fetch.patch** (337 lines)

## Next Steps

1. Test with actual GitHub releases
2. Consider adding:
   - Progress bars for downloads
   - Cleanup option for downloaded tarballs
   - Support for authentication tokens (higher rate limits)
   - Pre-release filtering
   - Checksum verification
3. Update AGENTS.md with fetch command
