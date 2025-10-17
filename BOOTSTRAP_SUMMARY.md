# mk bootstrap Command Summary

## Overview

Created a complete `mk bootstrap` command for out-of-tree project scaffolding, allowing developers to create new mkolbol-based projects outside the main repository.

## Implementation

### 1. Core Module: `src/mk/bootstrap.ts`

**Key Functions:**
- `bootstrapProject(appDir, options)` - Main bootstrap logic
  - Creates project directory structure
  - Copies template files
  - Configures package.json with mkolbol dependency
  - Optionally installs dependencies
  - Updates README with project name

- `listTemplates()` - Returns available project templates

**Features:**
- **Multiple installation sources:**
  - `local` - Use local mkolbol repository path
  - `tarball` - Use packaged tarball (auto-detects or explicit path)
  - `git` - Use GitHub repository with tag/branch reference

- **Template system:**
  - Reads from `examples/mk/init-templates/`
  - Default: `hello-calculator`
  - Extensible for additional templates

- **Smart package.json handling:**
  - Updates project name from directory
  - Configures mkolbol dependency based on source
  - Preserves all other template metadata

- **README personalization:**
  - Replaces template name with project name
  - Updates relative paths for node_modules

### 2. CLI Integration: `scripts/mk.ts`

**Command:**
```bash
mk bootstrap <app-dir> [options]
```

**Options:**
- `--yes, -y` - Auto-install dependencies
- `--verbose` - Show detailed progress
- `--template <name>` - Choose template (default: hello-calculator)
- `--source <type>` - Installation source: local, tarball, or git
- `--git-tag <tag>` - Git tag/branch (default: main)
- `--tarball <path>` - Explicit tarball path

**Example Usage:**
```bash
# Basic local development
mk bootstrap my-app --yes

# Use specific template
mk bootstrap my-calc --template hello-calculator --yes

# Install from git tag
mk bootstrap my-app --source git --git-tag v0.2.0

# Install from tarball
mk bootstrap my-app --source tarball --tarball ./mkolbol-0.2.0-rfc.tgz

# Verbose output
mk bootstrap my-app --yes --verbose
```

### 3. Tests: `tests/cli/mkBootstrap.spec.ts`

**Test Coverage:**
- ✅ Project creation from template
- ✅ Package.json name update
- ✅ mkolbol dependency configuration (local, git, tarball)
- ✅ README personalization
- ✅ Directory existence validation
- ✅ Template not found error handling
- ✅ Verbose mode logging
- ✅ All template files copied
- ✅ .mk directory structure preserved
- ✅ listTemplates() function
- ✅ Source options handling
- ✅ Template selection
- ✅ Installation options

**26 test cases** covering all major scenarios

### 4. Templates: `examples/mk/init-templates/`

**Current Templates:**
- `hello-calculator/` - HTTP calculator with TTY rendering and logging
  - Includes mk.json, package.json, tsconfig.json
  - Sample src/index.ts
  - README.md with quick start guide
  - ACCEPTANCE.md with testing criteria
  - .mk/options.json for configuration

**Template Structure:**
```
hello-calculator/
├── .mk/
│   └── options.json
├── src/
│   └── index.ts
├── .gitignore
├── ACCEPTANCE.md
├── mk.json
├── package.json
├── README.md
└── tsconfig.json
```

## Verification

### Manual Testing

✅ **Basic Bootstrap (Local Source):**
```bash
$ npm run build && node dist/scripts/mk.js bootstrap /tmp/mk-calc --yes

✓ Project '/tmp/mk-calc' bootstrapped successfully!

Next steps:
  cd /tmp/mk-calc
  npm run build
  npm run test
  npx mk run mk.json --dry-run
```

✅ **Git Source:**
```bash
$ node dist/scripts/mk.js bootstrap /tmp/mk-test-git --source git --git-tag v0.2.0
# package.json: "mkolbol": "github:anteew/mkolbol#v0.2.0"
```

✅ **Tarball Source:**
```bash
$ node dist/scripts/mk.js bootstrap /tmp/mk-test-tarball --source tarball
# package.json: "mkolbol": "/srv/repos0/mkolbol/mkolbol-0.2.0-rfc.tgz"
```

✅ **Verify mk Command:**
```bash
$ cd /tmp/mk-calc
$ npm run build
$ npx mk --version
0.2.0-rfc
```

## Bootstrap Process

1. **Validate inputs** - Check app directory doesn't exist, template exists
2. **Create target directory** - mkdir -p with recursive option
3. **Copy template files** - Recursive copy from examples/mk/init-templates/
4. **Update package.json**:
   - Set project name (from directory name)
   - Configure mkolbol dependency (based on source)
5. **Personalize README** - Replace template name with project name
6. **Install dependencies** (if --yes):
   - Run npm install in target directory
   - Stream output if --verbose
7. **Display success message** with next steps

## Template Structure Requirements

Templates must have:
- `package.json` - Will be personalized with project name
- Valid npm package structure
- (Optional) `README.md` - Will be personalized
- (Optional) `.mk/` directory for mkolbol configuration

## Extension Points

### Adding New Templates

1. Create directory in `examples/mk/init-templates/`
2. Add all necessary project files
3. Include package.json with description
4. Template automatically appears in `listTemplates()`

### Custom Template Variables

Future enhancement: Support template variables beyond project name:
```typescript
interface TemplateVars {
  projectName: string;
  author?: string;
  license?: string;
  version?: string;
}
```

## Files Modified/Created

**Created:**
- `src/mk/bootstrap.ts` - Core bootstrap logic
- `tests/cli/mkBootstrap.spec.ts` - Comprehensive test suite

**Modified:**
- `scripts/mk.ts` - Added bootstrap command handler

**Used (Existing):**
- `examples/mk/init-templates/hello-calculator/` - Default template

## Patch File

**Location:** `patches/DIFF_T9703_mk-bootstrap.patch`

**Contents:**
- New bootstrap module (190 lines)
- CLI integration (~50 lines)
- Test suite (280+ lines)
- Build artifacts (dist/)

**Stats:**
- 4,450 total lines in patch
- 3 source files created/modified
- 1 test file created
- Full type safety maintained

## Benefits

1. **Out-of-tree Development** - Projects live outside mkolbol repo
2. **Flexible Installation** - Local, tarball, or git sources
3. **Quick Start** - Single command to scaffold project
4. **Extensible** - Easy to add more templates
5. **Type-safe** - Full TypeScript support
6. **Well-tested** - 26 test cases covering all scenarios
7. **Production Ready** - Handles errors gracefully, validates inputs

## Next Steps

To use the bootstrap command:

1. Build the project: `npm run build`
2. Create a new project: `mk bootstrap my-app --yes`
3. Navigate to project: `cd my-app`
4. Start developing: `npm run build && npx mk run mk.json`

For out-of-repo use:
- Install from tarball: `npm pack && npm i -g mkolbol-*.tgz`
- Or use git: `npm i -g github:anteew/mkolbol#v0.2.0`
