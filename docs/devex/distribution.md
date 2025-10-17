# Distribution Matrix: Choosing Your Installation Path

This guide helps you choose the right way to install and distribute mkolbol for your use case.

## Quick Reference

| Installation Path                     | Use Case                                   | Ease       | Control    | Network     | Reproducibility   |
| ------------------------------------- | ------------------------------------------ | ---------- | ---------- | ----------- | ----------------- |
| **Tarball** (Recommended)             | Early adopters, CI/CD, reproducible builds | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ Offline  | ⭐⭐⭐⭐⭐        |
| **Git Tag** (Pinned)                  | Teams with git workflows, version tracking | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ✅ Required | ⭐⭐⭐⭐          |
| **Vendor/Local** (Monorepo)           | Same-repo development, zero dependencies   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ Offline  | ⭐⭐⭐⭐⭐        |
| Local Dev (`npm link`)                | Active development, debugging              | ⭐⭐⭐⭐   | ⭐⭐⭐     | ✅ Required | ⭐⭐              |
| GitHub Raw (`npm install github:...`) | Latest features, beta testing              | ⭐⭐       | ⭐         | ✅ Required | ⭐ (cache issues) |

---

## 1. Tarball (Recommended)

**Best for:** Early adopters, teams, production deployments, reproducible builds.

### What is a Tarball?

A tarball is a compressed archive (typically `.tgz` from `npm pack`) containing the mkolbol package. It's similar to an npm package but **doesn't require registry access**.

### Advantages

✅ **Reproducible**: Same exact version every time
✅ **Offline**: Works without internet (after download)
✅ **Verifiable**: Can inspect contents before using
✅ **Version-pinned**: Clear version number in filename
✅ **CI/CD-friendly**: Easy to commit to git or store in artifact repos
✅ **Fast**: No npm registry queries

### How to Get a Tarball

#### Option A: GitHub Releases (When Available)

```bash
# Download from GitHub releases page
# https://github.com/anteew/mkolbol/releases
curl -L https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-0.2.0.tgz \
  -o mkolbol-0.2.0.tgz

# Or using wget
wget https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-0.2.0.tgz
```

#### Option B: GitHub Archive (Always Available)

```bash
# Download source directly from GitHub tag
curl -L https://codeload.github.com/anteew/mkolbol/tar.gz/v0.2.0 \
  -o mkolbol-0.2.0.tar.gz  # Source archive (requires build)
```

#### Option C: Local Creation (For Custom Builds)

```bash
# Inside mkolbol repository
npm run build              # Build TypeScript
npm pack                   # Create tarball

# Result: mkolbol-0.2.0.tgz in current directory
```

### How to Use a Tarball

#### Step 1: Extract the Tarball

```bash
tar -xzf mkolbol-0.2.0.tgz
cd package  # GitHub creates a 'package' directory
```

Or directly with npm:

```bash
npm install ./mkolbol-0.2.0.tgz
```

#### Step 2: Reference in Your Project

**In package.json:**

```json
{
  "dependencies": {
    "mkolbol": "file:../path/to/mkolbol-0.2.0.tgz"
  }
}
```

**Then run:**

```bash
npm install
```

#### Step 3: Use mkolbol

```bash
npx mkctl run --file config.yml --duration 10
```

### Tarball in CI/CD

#### Store in Artifact Repository

```bash
# Build and archive
npm run build
npm pack

# Upload to artifact repo (example: Artifactory, Nexus)
curl -X PUT \
  --upload-file mkolbol-0.2.0.tgz \
  https://artifacts.company.com/npm/mkolbol/0.2.0/
```

#### Download in CI Pipeline

```yaml
# .github/workflows/test.yml
- name: Download mkolbol tarball
  run: |
    curl -L https://artifacts.company.com/npm/mkolbol/0.2.0/mkolbol-0.2.0.tgz \
      -o mkolbol.tar.gz
    npm install ./mkolbol.tar.gz
```

### Verify Tarball Contents

```bash
# List files in tarball without extracting
tar -tzf mkolbol-0.2.0.tar.gz | head -20

# Extract to inspect
tar -xzf mkolbol-0.2.0.tar.gz
ls -la package/  # GitHub creates 'package' directory
```

---

## 2. Git Tag (Pinned)

**Best for:** Teams with git workflows, version control visibility, integration testing.

### How It Works

Instead of using npm registry or tarballs, you pin a specific git tag directly.

### Installation via Git Tag

```bash
# In package.json
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#v0.2.0"
  }
}
```

Then run:

```bash
npm install
```

### Advantages

✅ **Git-native**: Aligns with git workflows
✅ **Version visible**: Tag name in package.json
✅ **Easy updates**: Change tag, run `npm install`
✅ **CI-friendly**: Can use same syntax in CI configs
✅ **Easy rollback**: Just change the tag

### Disadvantages

⚠️ **Requires network**: Must clone from GitHub
⚠️ **Cache issues**: npm may cache versions incorrectly
⚠️ **Slower**: Clone is slower than tarball download
⚠️ **Requires git**: npm must have git available

### Pin Specific Version

```bash
# Use exact commit hash for maximum precision
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#d138516fcadc152c61b16bc362bbbdbde84edfc6"
  }
}
```

### View Available Tags

```bash
# List remote tags
git ls-remote --tags https://github.com/anteew/mkolbol.git

# Output example:
# d138516fcadc152c61b16bc362bbbdbde84edfc6 refs/tags/v0.2.0
# 77e547b1f4d2c9e6a8b3f5c9e2d1a0f9b8c7d6e5 refs/tags/v0.1.0
```

---

## 3. Vendor/Local (Monorepo)

**Best for:** Same-repo development, zero external dependencies, maximum control.

### How It Works

Copy mkolbol source directly into your repository (typically a `vendor/` or `packages/` directory).

### Directory Structure

```
your-project/
├── packages/
│   ├── mkolbol/           # Copy mkolbol source here
│   │   ├── src/
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── my-app/
│       ├── src/
│       └── package.json
└── package.json (workspace root)
```

### Setup with npm Workspaces

**Root package.json:**

```json
{
  "name": "my-workspace",
  "workspaces": ["packages/mkolbol", "packages/my-app"]
}
```

**packages/my-app/package.json:**

```json
{
  "dependencies": {
    "mkolbol": "workspace:*"
  }
}
```

### Setup with Relative Paths

**packages/my-app/package.json:**

```json
{
  "dependencies": {
    "mkolbol": "file:../mkolbol"
  }
}
```

### Advantages

✅ **No network**: Works completely offline
✅ **Full control**: Modify source directly
✅ **Fast development**: Changes take effect immediately
✅ **No external deps**: Everything in one place
✅ **Git-native**: Entire project in git
✅ **Easy debugging**: Access all source

### Disadvantages

⚠️ **Larger repo**: Includes mkolbol codebase
⚠️ **Update friction**: Manual merges when mkolbol updates
⚠️ **Monorepo complexity**: Requires workspace setup
⚠️ **Storage**: Duplicate copies if multiple repos use it

### Update Mkolbol in Vendor

```bash
# Option 1: Manual update
cd packages/mkolbol
git fetch origin  # or manually download
git checkout v0.2.1

# Option 2: Subtree (advanced)
git subtree pull --prefix packages/mkolbol \
  https://github.com/anteew/Laminar.git v0.2.1
```

---

## 4. Comparison Table: When to Use Each

| Scenario                | Recommended                | Why                                                |
| ----------------------- | -------------------------- | -------------------------------------------------- |
| First time, quick start | **Tarball**                | Simple, reproducible, works offline after download |
| Team CI/CD pipeline     | **Tarball**                | Stable, auditable, easy to cache                   |
| Open source integration | **Git tag**                | Keep in git history, easy to update                |
| Monorepo / same repo    | **Vendor/Local**           | Full control, no network needed                    |
| Active development      | **Vendor/Local**           | Fast iteration, source visible                     |
| Beta testing            | **Git tag** or **Tarball** | Try latest features safely                         |
| Production deployment   | **Tarball**                | Maximum reproducibility                            |
| Air-gapped environment  | **Tarball** or **Vendor**  | Works offline                                      |

---

## 5. Migration Path: Tarball → Git Tag → Vendor

### Stage 1: Tarball (Start Here)

New project? Fresh team? **Use Tarball**.

```json
// package.json
{
  "dependencies": {
    "mkolbol": "file:./mkolbol-0.2.0.tar.gz"
  }
}
```

### Stage 2: Git Tag (When Versioning Matters)

Once your project matures and you need version visibility:

```json
{
  "dependencies": {
    "mkolbol": "github:anteew/Laminar#v0.2.0"
  }
}
```

### Stage 3: Vendor/Local (For Active Development)

If you're contributing to mkolbol or need full control:

```json
{
  "dependencies": {
    "mkolbol": "file:./packages/mkolbol"
  }
}
```

---

## 6. Decision Tree

```
START: How will you install mkolbol?

├─ Q1: Do you need to modify mkolbol source?
│  ├─ YES → Use Vendor/Local
│  └─ NO → Q2
│
├─ Q2: Will this run offline?
│  ├─ YES → Use Tarball
│  └─ NO → Q3
│
├─ Q3: Need version in git history?
│  ├─ YES → Use Git Tag
│  └─ NO → Use Tarball (still recommended)
```

---

## 7. Commands Cheat Sheet

### Tarball Installation

```bash
# Download
curl -L https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz -o mkolbol-0.2.0.tar.gz

# Extract
tar -xzf mkolbol-0.2.0.tar.gz

# Install via npm
npm install ./mkolbol-0.2.0.tar.gz

# Use
npx mkctl run --file config.yml
```

### Git Tag Installation

```bash
# Add to package.json manually or:
npm install github:anteew/Laminar#v0.2.0

# Or with commit hash
npm install github:anteew/Laminar#d138516

# Update to new tag
npm install github:anteew/Laminar#v0.3.0
```

### Vendor/Local Setup

```bash
# Create workspace structure
mkdir -p packages/my-app
git clone https://github.com/anteew/Laminar packages/mkolbol

# Install from workspace
npm install

# Or use file path
npm install file:../packages/mkolbol
```

---

## 8. Troubleshooting

### "Cannot find module" after tarball install

**Problem**: Module appears in node_modules but can't be imported.

**Solution**:

```bash
# Verify extraction
tar -tzf mkolbol-0.2.0.tar.gz | grep package.json

# Re-extract if needed
rm -rf node_modules/mkolbol
npm install ./mkolbol-0.2.0.tar.gz
```

### Git tag not updating

**Problem**: `npm install` uses cached version.

**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Vendor path not resolving

**Problem**: `file:` path doesn't work in workspace.

**Solution**:

```bash
# Use workspaces in root package.json
{
  "workspaces": ["packages/mkolbol", "packages/my-app"]
}

# Then in my-app/package.json
{
  "dependencies": {
    "mkolbol": "workspace:*"
  }
}
```

---

## 9. Production Checklist

Before deploying, confirm:

- [ ] Installation method chosen (Tarball/Git tag/Vendor)
- [ ] Dependencies resolved without network errors
- [ ] Version pinned (not using `latest` or loose versions)
- [ ] Build passes: `npm run build`
- [ ] Tests pass with installed version
- [ ] CI/CD pipeline configured for chosen method
- [ ] Rollback procedure documented (for update failures)
- [ ] Team members understand installation method

---

## Next Steps

- **[Hello Calculator](./hello-calculator.md)** — Get started with a quick example
- **[Packaging Guide](./packaging.md)** — Bundle your application for distribution
- **[Using mkolbol in Your Repo](./using-mkolbol-in-your-repo.md)** — Integration guide
