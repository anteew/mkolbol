# Packaging and Distribution Guide

This guide shows you how to package your mkolbol-based application and its custom servers into a single distributable executable or bundle. This is essential for shipping your application to users or deploying to production environments.

## Table of Contents

1. [Tarball Installation](#tarball-installation)
2. [Git Tag Pinning](#git-tag-pinning)
3. [Bundling Approaches](#bundling-approaches)
4. [Runtime Configuration](#runtime-configuration-discovery)
5. [Deployment Checklist](#deployment-checklist)

## Tarball Installation

mkolbol releases are published as `.tgz` tarballs on GitHub. You can install specific versions using either npm directly or the `mk fetch` command.

### Using npm

Install a specific release from a local tarball:

```bash
npm install ./mkolbol-v0.2.0.tgz
```

Or from a URL:

```bash
npm install https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-v0.2.0.tgz
```

### Using mk fetch (Experimental)

The `mk fetch` command downloads and installs a release tarball by tag:

```bash
# Install a specific version
mk fetch v0.2.0

# Install the latest release
mk fetch latest
```

**What it does**:
1. Queries GitHub releases API for the specified tag
2. Downloads the `.tgz` asset to your current directory
3. Runs `npm install <tarball>` to install it
4. Updates your `package.json` and `package-lock.json`

**Examples**:

```bash
# Install specific version
$ mk fetch v0.2.0
Fetching release v0.2.0...
Downloaded to /path/to/mkolbol-v0.2.0.tgz
Installing from /path/to/mkolbol-v0.2.0.tgz...
Installation complete

# Install latest stable release
$ mk fetch latest
Fetching release latest...
Downloaded to /path/to/mkolbol-v0.3.0.tgz
Installing from /path/to/mkolbol-v0.3.0.tgz...
Installation complete
```

**Limitations**:
- Requires internet connection to GitHub
- Only works with published GitHub releases
- Does not support pre-release tags (alpha, beta)
- Experimental feature, API may change

## Git Tag Pinning

For development or CI/CD, you can pin mkolbol to a specific git commit or tag using npm's git protocol:

### Pin to a tag

```json
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#v0.2.0"
  }
}
```

### Pin to a commit SHA

```json
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#a1b2c3d4"
  }
}
```

### Pin to a branch

```json
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#main"
  }
}
```

**Install**:

```bash
npm install
```

**Pros**:
- Pin to any commit, tag, or branch
- No need to wait for npm registry publish
- Works in CI/CD environments
- Reproducible builds

**Cons**:
- Requires git checkout and build on install
- Slower than tarball install
- Requires build dependencies (TypeScript, etc.)
- Not suitable for production deployments

**When to use**:
- Development against unreleased features
- Testing release candidates
- CI/CD pipelines with specific version requirements
- Contributing to mkolbol development

## Overview

When you build an application with mkolbol, you typically have:
- Your custom server modules (TypeScript/JavaScript)
- The mkolbol kernel and its dependencies
- External process scripts (Python, Go, Rust, etc.)
- Configuration files (topology YAML/JSON)
- Runtime dependencies (node_modules)

Packaging consolidates these into a distributable artifact that can be run on target systems without requiring a full development environment.

## Bundling Approaches

There are three popular tools for packaging Node.js applications:

### 1. esbuild

**Overview**: An extremely fast JavaScript bundler and minifier written in Go.

**How it works**:
- Bundles all JavaScript/TypeScript into a single file
- Tree-shakes unused code
- Minifies output
- Outputs a JavaScript file that still requires Node.js to run

**Pros**:
- Blazingly fast (10-100x faster than webpack)
- Simple configuration
- Excellent TypeScript support
- Small bundle sizes with tree-shaking
- Works well with ESM and CommonJS
- Minimal overhead for native modules

**Cons**:
- Still requires Node.js runtime on target
- Limited support for dynamic requires
- No binary executable output
- Native modules (like node-pty) need special handling

**Best for**:
- Fast development iteration
- Docker/container deployments (Node.js is available)
- Cloud functions / serverless
- Internal tooling with Node.js already installed

### 2. @vercel/ncc

**Overview**: Simple CLI for compiling Node.js modules into a single file, designed by Vercel.

**How it works**:
- Uses webpack under the hood
- Bundles everything into one .js file
- Includes all dependencies
- Optimized for serverless deployments

**Pros**:
- Zero configuration required
- Designed specifically for Node.js applications
- Good native module support
- Handles dynamic requires better than esbuild
- Small learning curve

**Cons**:
- Still requires Node.js runtime
- Slower than esbuild
- Less flexibility in configuration
- Larger bundle sizes than esbuild
- Can struggle with complex dependency trees

**Best for**:
- Serverless deployments (Vercel, AWS Lambda, etc.)
- Simple applications with straightforward dependencies
- Quick prototyping without configuration overhead

### 3. pkg

**Overview**: Package Node.js projects into standalone executables for Windows, macOS, and Linux.

**How it works**:
- Bundles Node.js runtime + your code
- Creates platform-specific native executables
- Embeds file system (snapshots your app)
- No Node.js required on target

**Pros**:
- Produces true standalone executables
- No Node.js required on target system
- Cross-platform builds from single machine
- Great for distributing CLI tools
- Users get native binary experience

**Cons**:
- Large binary size (40-50MB+, includes Node.js)
- Slow build times
- Native modules can be problematic
- Dynamic requires need special configuration
- File system access quirks (virtual fs)
- Project is less actively maintained

**Best for**:
- Distributing CLI tools to non-technical users
- Environments where Node.js can't be installed
- Desktop applications
- Situations requiring maximum portability

## Comparison Table

| Feature | esbuild | @vercel/ncc | pkg |
|---------|---------|-------------|-----|
| **Speed** | Extremely fast (< 1s) | Fast (2-5s) | Slow (10-30s) |
| **Bundle Size** | Small (< 1MB) | Medium (1-3MB) | Large (40-50MB+) |
| **Requires Node.js** | Yes | Yes | No |
| **Native Modules** | Moderate support | Good support | Difficult |
| **Configuration** | Simple | Zero config | Moderate |
| **Tree-shaking** | Excellent | Good | Limited |
| **Output Format** | .js file | .js file | Native executable |
| **Cross-platform** | Yes (code) | Yes (code) | Yes (binaries) |
| **Dynamic requires** | Limited | Good | Requires config |
| **Active Development** | Very active | Active | Less active |

## Recommendation: esbuild

For early adopters of mkolbol, we recommend **esbuild** for the following reasons:

1. **Speed**: Development iteration is fast; rebuilding takes less than a second
2. **Simplicity**: Minimal configuration needed
3. **Size**: Produces small, optimized bundles
4. **Compatibility**: Works well with mkolbol's ESM architecture
5. **Native modules**: node-pty (used by mkolbol) can be excluded and loaded at runtime
6. **Flexibility**: Easy to switch to ncc or pkg later if requirements change

The tradeoff is that users need Node.js installed, but for early adopters (typically developers), this is a reasonable assumption.

## Example: Bundling with esbuild

### Step 1: Install esbuild

In your project (not the mkolbol kernel repo):

```bash
npm install --save-dev esbuild
```

### Step 2: Create a Bundle Script

See `examples/early-adopter/scripts/build-bundle.mjs` for a complete example.

**Basic bundling command**:

```bash
npx esbuild src/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile=dist/runner.js \
  --external:node-pty \
  --external:yaml
```

**Explanation**:
- `--bundle`: Combine all dependencies into one file
- `--platform=node`: Target Node.js (not browser)
- `--target=node20`: Use Node.js 20+ features
- `--format=esm`: Output ES modules
- `--outfile=dist/runner.js`: Output path
- `--external:node-pty`: Keep node-pty as external (native module)
- `--external:yaml`: Keep yaml as external (optional, can be bundled)

### Step 3: Add to package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "build:bundle": "node scripts/build-bundle.mjs",
    "start:bundle": "node dist/runner.js"
  }
}
```

### Step 4: Run the Bundle

```bash
npm run build:bundle
node dist/runner.js
```

### Expected Output

```
dist/
├── runner.js          # Your bundled application (~500KB - 2MB)
└── runner.js.map      # Source map for debugging (optional)
```

The bundle includes:
- Your application code
- mkolbol kernel
- All JavaScript dependencies

Excluded (must be installed separately):
- node-pty (native module)
- yaml (if marked external)

## Runtime Configuration Discovery

When your bundled application runs, it needs to find configuration files and environment variables.

### Environment Variables

Environment variables work the same in bundled and non-bundled code:

```typescript
// In your application
const DEBUG = process.env.DEBUG === '1';
const PORT = parseInt(process.env.PORT || '8080', 10);
const CONFIG_PATH = process.env.CONFIG_PATH || './config.yml';
```

**Usage**:
```bash
DEBUG=1 PORT=3000 node dist/runner.js
```

### Configuration Files

Configuration files are loaded at runtime, so they must exist on the file system.

**Recommended pattern**:

```typescript
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory of the bundled file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load config relative to bundle location
const configPath = process.env.CONFIG_PATH || join(__dirname, '../config/topology.yml');
const configData = readFileSync(configPath, 'utf-8');
```

**Directory structure for deployment**:
```
deployment/
├── dist/
│   └── runner.js       # Bundled app
├── config/
│   └── topology.yml    # Runtime config
├── node_modules/       # Only node-pty and other externals
│   └── node-pty/
└── package.json        # Minimal (just externals)
```

**Minimal package.json for deployment**:
```json
{
  "name": "my-mkolbol-app",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "node-pty": "^1.0.0",
    "yaml": "^2.3.4"
  }
}
```

### Discovery Precedence

Use this pattern for flexible configuration:

```typescript
import { existsSync } from 'fs';

function findConfig(): string {
  // 1. Environment variable (highest priority)
  if (process.env.CONFIG_PATH) {
    return process.env.CONFIG_PATH;
  }

  // 2. Current working directory
  const cwdConfig = join(process.cwd(), 'topology.yml');
  if (existsSync(cwdConfig)) {
    return cwdConfig;
  }

  // 3. Relative to bundle
  const bundleConfig = join(__dirname, '../config/topology.yml');
  if (existsSync(bundleConfig)) {
    return bundleConfig;
  }

  // 4. Default fallback
  throw new Error('No configuration file found. Set CONFIG_PATH environment variable.');
}

const configPath = findConfig();
```

## Tips for Shrinking Bundle Size

### 1. Mark Native Modules as External

Always exclude native modules from the bundle:

```javascript
// build-bundle.mjs
external: ['node-pty', 'fsevents', 'better-sqlite3']
```

### 2. Use Tree-shaking

Import only what you need:

```typescript
// Good (tree-shakeable)
import { Kernel, Hostess } from 'mkolbol';

// Avoid (imports everything)
import * as mkolbol from 'mkolbol';
```

### 3. Minimize Dependencies

Audit your dependencies:

```bash
npm list --depth=0
```

Remove unused packages:
```bash
npm uninstall unused-package
```

### 4. Enable Minification

```javascript
// build-bundle.mjs
esbuild.build({
  // ...
  minify: true,        // Minify code
  treeShaking: true,   // Remove dead code
})
```

### 5. Analyze Bundle Size

```bash
# Install bundle analyzer
npm install --save-dev esbuild-visualizer

# Add to build script
metafile: true,
```

### 6. Split Large Dependencies

For very large apps, consider code splitting:

```javascript
// build-bundle.mjs
esbuild.build({
  // ...
  splitting: true,
  outdir: 'dist',  // Use outdir instead of outfile
  entryPoints: ['src/index.ts'],
  format: 'esm',
})
```

## Debugging Bundled Applications

### Enable Source Maps

```javascript
// build-bundle.mjs
esbuild.build({
  // ...
  sourcemap: 'linked',  // or 'inline' or 'external'
})
```

Run with source map support:
```bash
node --enable-source-maps dist/runner.js
```

### Preserve Function Names

```javascript
// build-bundle.mjs
esbuild.build({
  // ...
  keepNames: true,  // Preserve function/class names
})
```

### Add Debug Logging

```typescript
// In your application
const IS_BUNDLED = !process.argv[1].includes('src/');

if (IS_BUNDLED) {
  console.log('Running from bundle:', __filename);
} else {
  console.log('Running from source:', __filename);
}
```

### Inspect Bundle Contents

```bash
# Install esbuild metafile analyzer
npm install --save-dev esbuild-analyzer

# Generate metafile
esbuild --bundle src/index.ts --metafile=meta.json

# Analyze
npx esbuild-analyzer meta.json
```

### Use Node.js Inspector

Debug bundled code with Chrome DevTools:

```bash
node --inspect-brk dist/runner.js
```

Then open Chrome and navigate to: `chrome://inspect`

## Handling External Process Scripts

If your application uses external process modules (Python, Go, Rust), include them in your distribution:

### Directory Structure

```
deployment/
├── dist/
│   └── runner.js
├── scripts/
│   ├── echo-server.py
│   └── word-count.sh
├── config/
│   └── topology.yml
└── node_modules/
```

### Update Script Paths

Use paths relative to bundle or environment variables:

```typescript
// Before bundling
command: './scripts/echo-server.py'

// After bundling (use absolute paths)
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, '../scripts');

command: join(scriptsDir, 'echo-server.py')
```

Or use environment variables:

```typescript
const scriptsDir = process.env.SCRIPTS_DIR || join(__dirname, '../scripts');
```

## Alternative: Using @vercel/ncc

If you prefer zero-configuration bundling:

### Install ncc

```bash
npm install --save-dev @vercel/ncc
```

### Build Command

```bash
npx ncc build src/index.ts \
  -o dist \
  --external node-pty \
  --minify \
  --source-map
```

### package.json Script

```json
{
  "scripts": {
    "build:ncc": "ncc build src/index.ts -o dist --external node-pty --minify"
  }
}
```

Output:
```
dist/
└── index.js  # Everything bundled (larger than esbuild)
```

## Alternative: Using pkg (Standalone Executables)

If you need to distribute to users without Node.js:

### Install pkg

```bash
npm install --save-dev pkg
```

### Create pkg Configuration

**File: `package.json`**

```json
{
  "bin": "dist/runner.js",
  "pkg": {
    "scripts": "dist/**/*.js",
    "assets": [
      "config/**/*",
      "scripts/**/*"
    ],
    "targets": [
      "node20-linux-x64",
      "node20-macos-x64",
      "node20-win-x64"
    ],
    "outputPath": "build"
  }
}
```

### Build Executables

```bash
# First, bundle with esbuild or tsc
npm run build

# Then package with pkg
npx pkg .
```

Output:
```
build/
├── runner-linux
├── runner-macos
└── runner-win.exe
```

### Caveats with pkg

1. **Native modules**: node-pty may not work in pkg executables
2. **File system**: Use `path.join(process.cwd(), ...)` for external files
3. **Dynamic requires**: Add to `scripts` or `assets` config
4. **Large binaries**: Each is 40-50MB (includes Node.js runtime)

For mkolbol applications with node-pty, pkg is not recommended unless you can replace PTY functionality.

## Deployment Checklist

Before deploying your bundled application:

- [ ] Bundle builds without errors
- [ ] External dependencies (node-pty, yaml) are in package.json
- [ ] Configuration files are accessible at runtime
- [ ] External process scripts are included and executable
- [ ] Environment variables are documented
- [ ] Source maps are available for debugging
- [ ] Application starts and runs correctly from bundle
- [ ] All module wiring works as expected
- [ ] Hostess registration succeeds
- [ ] Tests pass against bundled version

## Example Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Building bundle..."
npm run build:bundle

echo "Copying runtime files..."
mkdir -p deployment/dist deployment/config deployment/scripts
cp dist/runner.js deployment/dist/
cp config/*.yml deployment/config/
cp scripts/* deployment/scripts/
chmod +x deployment/scripts/*.py deployment/scripts/*.sh

echo "Creating deployment package.json..."
cat > deployment/package.json <<EOF
{
  "name": "my-mkolbol-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node dist/runner.js"
  },
  "dependencies": {
    "node-pty": "^1.0.0",
    "yaml": "^2.3.4"
  }
}
EOF

echo "Installing production dependencies..."
cd deployment
npm install --production

echo "Testing bundle..."
npm start &
PID=$!
sleep 2
kill $PID || true

echo "Creating tarball..."
cd ..
tar -czf my-mkolbol-app.tar.gz deployment/

echo "Deployment package ready: my-mkolbol-app.tar.gz"
```

## Next Steps

After packaging your application:

1. **[Wiring and Tests Guide](./wiring-and-tests.md)** - Test your bundled application
2. **[Interactive Topology](./interactive-topology.md)** - Build interactive topologies
3. **[CI/CD Setup](../testing/ci.md)** - Automate builds and tests
4. **Production Deployment** - Deploy to your target environment

## Troubleshooting

### "Cannot find module" errors after bundling

**Problem**: Bundle can't find external modules.

**Solution**: Mark them as external in build script:
```javascript
external: ['node-pty', 'yaml']
```

### Native module errors

**Problem**: `node-pty` fails to load.

**Solution**:
1. Don't bundle native modules
2. Ensure node_modules/node-pty exists in deployment
3. Rebuild for target platform: `npm rebuild node-pty`

### Configuration file not found

**Problem**: Bundle can't find topology.yml.

**Solution**: Use proper path resolution:
```typescript
const configPath = join(process.cwd(), 'config/topology.yml');
```

### Bundle size too large

**Problem**: Bundle is several megabytes.

**Solution**:
1. Mark large dependencies as external
2. Enable tree-shaking and minification
3. Remove unused dependencies
4. Use dynamic imports for optional features

### External scripts not executable

**Problem**: Python/Bash scripts fail with permission errors.

**Solution**:
```bash
chmod +x scripts/*.py scripts/*.sh
```

Or in deployment script:
```typescript
import { chmodSync } from 'fs';
chmodSync('scripts/echo-server.py', 0o755);
```

---

**You're ready to ship!** Start with esbuild for fast iteration, and consider pkg or Docker for distribution if your deployment requirements change.
