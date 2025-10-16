# mkolbol Releases

This guide covers:
1. **Release Candidate (RC)** - Current status, features, install paths, known limitations
2. **Creating Releases** - For maintainers: how to publish new versions
3. **Consuming Releases** - For users: how to install specific versions

---

## Release Candidate (RC) — Local Node v1.0

**Status:** 🚧 Release Candidate | **Target:** v1.0.0 | **Last Updated:** 2025-10-17

### What's Included

This RC delivers the complete **Local Node v1.0** experience with:

#### Core Features
- ✅ **Stream Kernel** - ~100 line microkernel with pipes, connect, split, merge
- ✅ **Local Node Mode** - In-process routing (MK_LOCAL_NODE=1 enforced)
- ✅ **Router & Hostess** - Endpoint discovery and health monitoring
- ✅ **Executor** - Topology orchestration from YAML/JSON configs
- ✅ **mkctl CLI** - Run topologies (`mkctl run`) and inspect endpoints (`mkctl endpoints`)

#### Modules (Production-Ready)
- ✅ **ExternalProcess** - Spawn external processes (stdio/pty modes)
- ✅ **FilesystemSink** - Write to files (JSONL, raw, append/truncate modes)
- ✅ **ConsoleSink** - Console output with prefixes
- ✅ **PipeMeterTransform** - Throughput and latency metrics
- ✅ **TimerSource** - Periodic data generation
- ✅ **UppercaseTransform** - String transformation example

#### Developer Experience (RC)
- ✅ **mk CLI** - Project scaffolding and workflow orchestrator
  - `mk init` - Initialize projects with templates (hello-calculator)
  - `mk run` - Execute topologies with validation
  - `mk doctor` - Health checks and diagnostics
  - `mk format` - Convert between JSON/YAML
  - `mk build` - Compile and bundle artifacts
  - `mk package` - Create distributable tarballs
  - `mk ci plan` - Generate GitHub Actions workflow
- ✅ **First Five Minutes Guide** - Complete workflow from init to deployment
- ✅ **Doctor Guide** - Troubleshooting common errors
- ✅ **Authoring Guide** - Write custom modules
- ✅ **Recipes** - 9 curated topology patterns
- ✅ **CI Integration** - Acceptance smoke tests with Laminar

### Installation Paths

**See [Distribution Matrix](./distribution.md) for complete installation guide.**

#### Method 1: Tarball (Recommended for RC)
```bash
# Download from GitHub Releases (when published)
curl -L https://github.com/anteew/mkolbol/releases/download/v1.0.0-rc.1/mkolbol-1.0.0-rc.1.tar.gz \
  -o mkolbol-1.0.0-rc.1.tar.gz

# Install in your project
npm install ./mkolbol-1.0.0-rc.1.tar.gz
```

#### Method 2: Git Tag (For Development)
```bash
# Clone specific RC tag
git clone --branch v1.0.0-rc.1 https://github.com/anteew/mkolbol.git mkolbol-rc
cd mkolbol-rc
npm install
npm run build
```

#### Method 3: npm Registry
> **Not Yet Available**: mkolbol is not published to npm. Use tarball or git tag.

### Known Limitations (RC)

#### mk CLI Implementation Status
- ⚠️ **Partial Implementation**: Most mk commands return placeholder help text (implementation in progress)
- ⚠️ **No Wizard Mode**: `mk init` requires inline args (`--lang ts --preset tty`), no interactive prompts yet
- ⚠️ **No Hot Reload**: `mk dev` not yet implemented (manual restart required)
- ⚠️ **No Structured Logs**: `mk logs --module X` not yet implemented (use manual inspection)
- ⚠️ **No Trace Analysis**: `mk trace` not yet implemented (use manual performance profiling)
- ⚠️ **Did-You-Mean**: Typo suggestions not yet implemented (generic error messages)

#### Local Node Mode Only
- ⚠️ **Single Machine**: Distributed routing (multi-machine topologies) not yet available
- ⚠️ **In-Process Only**: Worker threads and external process modes limited
- ⚠️ **Network Features Gated**: MK_LOCAL_NODE=1 disables network transports

#### Module Ecosystem
- ⚠️ **Limited Modules**: 6 core modules available, community modules not yet published
- ⚠️ **No Plugin System**: Custom modules require code changes (no dynamic loading)
- ⚠️ **TTY Rendering**: XtermTTYRenderer module not yet fully integrated

#### Testing & CI
- ⚠️ **Non-Gating Smoke Tests**: Acceptance tests run but don't block PRs
- ⚠️ **Flake Detection**: Laminar trends available but not enforced

### Roadmap to v1.0.0

**Before Final Release:**
- [ ] Implement mk dev (hot reload)
- [ ] Implement mk logs (structured log streaming)
- [ ] Implement mk trace (latency analysis)
- [ ] Add did-you-mean for CLI typos
- [ ] Expand module ecosystem (5+ community modules)
- [ ] Make acceptance smoke tests gating
- [ ] Add performance benchmarks

**Future (v1.1+):**
- [ ] Distributed routing (multi-machine topologies)
- [ ] Worker thread support
- [ ] Plugin system for dynamic module loading
- [ ] Browser support (WASM kernel)
- [ ] Cloud deployment templates (AWS, GCP, Azure)

### Getting Started

**Quickest Path (10 minutes):**
1. Read [First Five Minutes Guide](./first-five-minutes.md)
2. Run the hello-calculator example:
   ```bash
   git clone https://github.com/anteew/mkolbol.git
   cd mkolbol
   npm install && npm run build
   export MK_LOCAL_NODE=1
   node dist/scripts/mk.js init hello-calculator --lang ts --preset tty
   cd hello-calculator
   node ../dist/scripts/mk.js run --file mk.json --duration 10
   ```
3. Explore [Recipes](./recipes.md) for more patterns

**Deep Dive:**
- [Early Adopter Guide](./early-adopter-guide.md) - Architecture and concepts
- [mkctl Cookbook](./mkctl-cookbook.md) - Daily CLI reference
- [Authoring a Module](./authoring-a-module.md) - Write custom modules
- [CI Acceptance Smoke](./ci-acceptance-smoke.md) - GitHub Actions integration

### Feedback & Issues

- **Bug Reports**: [GitHub Issues](https://github.com/anteew/mkolbol/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/anteew/mkolbol/discussions)
- **Contributing**: [CONTRIBUTING-DEVEX.md](../../CONTRIBUTING-DEVEX.md)

---

## Creating and Consuming GitHub Releases with Tarballs

This guide explains how to create version releases of mkolbol and how consumers use them to install specific versions via tarball.

### Quick Start: For Consumers

Already have a version you want? Use this:

```bash
# Download specific version from GitHub Releases
curl -L https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz \
  -o mkolbol-0.2.0.tar.gz

# Install in your project
npm install ./mkolbol-0.2.0.tar.gz
```

---

## Part 1: Creating a Release (Maintainers)

### Prerequisites

- Commit access to the repository
- `git` command line tool
- Local clone of the repository

### Step 1: Prepare for Release

#### 1a. Update Version Numbers

Update the version in `package.json`:

```json
{
  "name": "mkolbol",
  "version": "0.2.0"
}
```

#### 1b. Update Changelog (Optional but Recommended)

Create or update `CHANGELOG.md`:

```markdown
## [0.2.0] - 2025-10-16

### Added
- Distribution matrix documentation
- Tarball-first installation path
- GitHub Releases workflow

### Fixed
- Bug fixes from 0.1.0

### Changed
- Documentation restructuring
```

#### 1c. Commit Version Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to 0.2.0"
```

### Step 2: Build the Distribution

```bash
# Install dependencies (if not already done)
npm install

# Build TypeScript to JavaScript
npm run build

# Create tarball from dist/ folder
npm pack

# Result: mkolbol-0.2.0.tgz created in current directory
ls -lh mkolbol-0.2.0.tgz
```

### Step 3: Create Git Tag

```bash
# Create a tag for the release
git tag -a v0.2.0 -m "Release version 0.2.0"

# Verify tag was created
git tag -l v0.2.0

# Push tag to GitHub
git push origin v0.2.0
```

**Tag naming convention:** Use `v<semver>` format (e.g., `v0.2.0`, `v1.0.0-beta.1`)

### Step 4: Create GitHub Release (Manual or Automated)

#### Option A: Manual Release via GitHub Web UI

1. Go to https://github.com/anteew/Laminar/releases
2. Click "Draft a new release"
3. Select tag: `v0.2.0`
4. Release title: "Release 0.2.0"
5. Description: Paste changelog content
6. Upload tarball: Drag `mkolbol-0.2.0.tgz` to release
7. Click "Publish release"

#### Option B: Automated Release via GitHub CLI

```bash
# Create release from tag
gh release create v0.2.0 \
  --title "Release 0.2.0" \
  --notes "See CHANGELOG.md for details" \
  mkolbol-0.2.0.tgz

# Verify release
gh release view v0.2.0
```

### Step 5: Verify Release

```bash
# List all releases
gh release list

# Download and verify tarball
curl -L https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz \
  -o test-download.tar.gz

# Verify contents
tar -tzf test-download.tar.gz | head -20
```

---

## Part 2: Consuming a Release (Developers)

### Finding Available Releases

#### Option 1: GitHub Web UI

Visit https://github.com/anteew/Laminar/releases to browse all releases.

#### Option 2: GitHub CLI

```bash
# List all releases
gh release list

# Output:
# TAG             TITLE               STATE   CREATED AT          ASSETS
# v0.2.0          Release 0.2.0       Latest  2025-10-16 12:34:00 1
# v0.1.0          Release 0.1.0       Draft   2025-09-16 10:20:00 1
```

#### Option 3: Git Command

```bash
# List all tags (releases are tagged)
git ls-remote --tags https://github.com/anteew/Laminar.git

# Output example:
# d138516fcadc152c61b16bc362bbbdbde84edfc6 refs/tags/v0.2.0
# a7f8e3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6 refs/tags/v0.1.0
```

### Downloading a Release

#### Method 1: Direct Download (Simple)

```bash
# Download from GitHub Releases
curl -L https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz \
  -o mkolbol-0.2.0.tar.gz

# Alternative: using wget
wget https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz
```

#### Method 2: GitHub Archive (Alternative)

If release tarball isn't available, download directly from GitHub:

```bash
# Download source from GitHub tag (includes .git history)
curl -L https://codeload.github.com/anteew/Laminar/tar.gz/v0.2.0 \
  -o mkolbol-v0.2.0-source.tar.gz

# This creates a tarball from the tag commit
```

**Note:** GitHub Archive includes git history and may be larger than release tarballs.

#### Method 3: Git Clone (For Development)

```bash
# Clone the repository at a specific tag
git clone --branch v0.2.0 https://github.com/anteew/Laminar.git mkolbol-v0.2.0

# This is best for development/contributions
```

### Installing from Downloaded Tarball

#### Step 1: Extract (if needed)

```bash
# Option A: Let npm handle it (recommended)
npm install ./mkolbol-0.2.0.tar.gz

# Option B: Manual extraction
tar -xzf mkolbol-0.2.0.tar.gz
cd package
npm install
```

#### Step 2: Reference in Your Project

**In your project's `package.json`:**

```json
{
  "dependencies": {
    "mkolbol": "file:./mkolbol-0.2.0.tar.gz"
  }
}
```

Then install:

```bash
npm install
```

### Using the Installed Version

```bash
# Use mkctl from installed mkolbol
npx mkctl run --file config.yml --duration 10

# Or if globally installed
npm install -g ./mkolbol-0.2.0.tar.gz
mkctl run --file config.yml --duration 10
```

---

## Continuous Release Workflow

### Automated Release via GitHub Actions

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Create tarball
        run: npm pack

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: mkolbol-*.tgz
          draft: false
          prerelease: ${{ contains(github.ref, 'beta') || contains(github.ref, 'alpha') }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Publishing Release Automatically

```bash
# Push a tag to trigger automated release
git tag v0.2.0
git push origin v0.2.0

# GitHub Actions will automatically:
# 1. Build the project
# 2. Create tarball
# 3. Upload to GitHub Release
# Monitor progress in Actions tab
```

---

## Release Checklist

### Before Creating Release

- [ ] All tests pass: `npm run build && npm test`
- [ ] Version updated in `package.json`
- [ ] CHANGELOG.md updated with changes
- [ ] Commit message clear and documented
- [ ] Local build tested with `npm pack`

### Creating Release

- [ ] Tag created: `git tag -a v0.2.0 -m "Release 0.2.0"`
- [ ] Tag pushed: `git push origin v0.2.0`
- [ ] GitHub Release created with tarball
- [ ] Release notes include migration guide (if major version)

### After Release

- [ ] Verify tarball downloads from GitHub Releases
- [ ] Test installation: `npm install ./mkolbol-0.2.0.tar.gz`
- [ ] Verify mkctl works: `npx mkctl --help`
- [ ] Announce release (if applicable)
- [ ] Update documentation with new version number

---

## Semver Versioning

Follow Semantic Versioning (semver) for release tags:

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Examples:
v0.2.0          ← Standard release
v1.0.0-beta.1   ← Beta release
v0.2.1-rc.1     ← Release candidate
```

**When to increment:**

- **MAJOR (0.x.0)**: Breaking changes to config format, API, or CLI
- **MINOR (x.1.0)**: New features (backward compatible)
- **PATCH (x.x.1)**: Bug fixes (backward compatible)
- **PRERELEASE**: Use `-alpha`, `-beta`, `-rc` for testing

---

## Troubleshooting

### Tag Already Exists

```bash
# Problem: "fatal: tag 'v0.2.0' already exists"

# Option 1: Use different tag
git tag v0.2.0-retry

# Option 2: Delete and recreate
git tag -d v0.2.0          # Delete locally
git push origin :v0.2.0    # Delete on GitHub
git tag -a v0.2.0 -m "Release 0.2.0"  # Recreate
```

### Tarball Not Generated

```bash
# Problem: npm pack produces no file

# Verify build works
npm run build

# Check package.json "files" field includes dist/
cat package.json | grep -A 10 '"files"'

# Manually create tarball
tar -czf mkolbol-0.2.0.tar.gz dist/ docs/ package.json README.md
```

### Download URL Wrong

```bash
# Verify correct download URL format:
# https://github.com/OWNER/REPO/releases/download/TAG/FILENAME

# Example for mkolbol:
# https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz

# Check available releases
gh release list
```

### Installation Fails After Download

```bash
# Problem: npm install ./mkolbol-0.2.0.tar.gz fails

# Solution 1: Verify tarball integrity
tar -tzf mkolbol-0.2.0.tar.gz | wc -l  # Should show many files

# Solution 2: Clear npm cache
npm cache clean --force
npm install ./mkolbol-0.2.0.tar.gz

# Solution 3: Manual extraction and install
tar -xzf mkolbol-0.2.0.tar.gz
cd package
npm install
```

---

## Distribution & Version Pinning

### Pin to Specific Release in package.json

```json
{
  "dependencies": {
    "mkolbol": "file:./mkolbol-0.2.0.tar.gz"
  }
}
```

### Pin to Release via Git Tag

```json
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#v0.2.0"
  }
}
```

### Pin via Commit Hash (Maximum Precision)

```json
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#d138516fcadc152c61b16bc362bbbdbde84edfc6"
  }
}
```

---

## Next Steps

- **[Distribution Matrix](./distribution.md)** — Compare installation methods
- **[Hello Calculator](./hello-calculator.md)** — Use a release to build an app
- **[Using mkolbol in Your Repo](./using-mkolbol-in-your-repo.md)** — Integration guide
- **[GitHub Releases API](https://docs.github.com/en/rest/releases/releases)** — Official GitHub docs
