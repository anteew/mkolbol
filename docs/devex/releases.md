# Creating and Consuming GitHub Releases with Tarballs

This guide explains how to create version releases of mkolbol and how consumers use them to install specific versions via tarball.

## Quick Start: For Consumers

Already have a version you want? Use this:

```bash
# Download specific version from GitHub Releases
curl -L https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz \
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
