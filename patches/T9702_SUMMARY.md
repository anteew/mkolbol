# T9702: Enhanced mk fetch with Caching and SHA-256 Verification

## Cache Structure

```
~/.mk/toolchains/
├── v0.2.0/
│   ├── mkolbol.tgz
│   └── mkolbol.tgz.sha256
├── v0.1.9/
│   ├── mkolbol.tgz
│   └── mkolbol.tgz.sha256
└── latest/
    ├── mkolbol.tgz
    └── mkolbol.tgz.sha256
```

## Verification Process

1. **Download Flow**:
   - Check for cached tarball at `~/.mk/toolchains/<tag>/mkolbol.tgz`
   - If cached and `--force` not set: use cached version
   - If not cached or forced: download from GitHub release
   - Download SHA-256 hash from GitHub release (if available)
   - Save hash to `mkolbol.tgz.sha256`

2. **Verification Flow** (with `--verify`):
   - Read expected hash from `.sha256` file
   - Calculate actual SHA-256 hash of tarball
   - Compare hashes; fail if mismatch
   - Display ✓ confirmation on success

3. **Installation Flow**:
   - By default: install tarball via `npm install`
   - With `--no-install`: only download/verify, skip installation
   - Display tarball path for manual use

## Features

- **Caching**: Downloads stored in `~/.mk/toolchains/<tag>/` for reuse
- **SHA-256 Verification**: Optional cryptographic verification with `--verify`
- **Force Download**: `--force` flag bypasses cache
- **Download Only**: `--no-install` skips npm install step
- **Latest Tag Support**: `mk fetch latest` resolves to latest GitHub release

## Usage Examples

```bash
# Download and install v0.2.0 (uses cache if available)
mk fetch v0.2.0

# Download with SHA-256 verification
mk fetch v0.2.0 --verify

# Force re-download (ignore cache)
mk fetch v0.2.0 --force

# Download only (no install)
mk fetch v0.2.0 --no-install

# Fetch latest release
mk fetch latest --verify

# Combine flags
mk fetch v0.2.0 --verify --no-install
```

## API Changes

### `downloadRelease(tag: string, options?: FetchOptions): Promise<string>`

**New Options**:
- `verify?: boolean` - Verify SHA-256 hash after download
- `forceDownload?: boolean` - Bypass cache and re-download

**Returns**: Absolute path to cached tarball

### New Exports

- `calculateSHA256(filePath: string): Promise<string>` - Calculate SHA-256 hash
- `verifyTarball(tarballPath: string, hashPath: string): Promise<boolean>` - Verify hash

## Security

- SHA-256 hashes downloaded from GitHub release assets
- Verification optional but recommended for security-sensitive environments
- Cache directory: `~/.mk/toolchains/` (user-writable)

## Tests

- CLI flag parsing and validation
- SHA-256 calculation and verification
- Cache structure validation
- Error handling for missing/mismatched hashes
