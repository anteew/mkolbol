# mk bootstrap Architecture

## Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User Command: mk bootstrap /tmp/my-app --yes --source git      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Parse Arguments & Validate                                   │
│    • Extract app directory: /tmp/my-app                         │
│    • Parse options: yes=true, source=git                        │
│    • Check directory doesn't exist                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Locate Template                                              │
│    • Default: hello-calculator                                  │
│    • Path: examples/mk/init-templates/hello-calculator          │
│    • Validate template exists                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Copy Template Files                                          │
│    • mkdir -p /tmp/my-app                                       │
│    • Recursive copy: template → target                          │
│    • Preserve directory structure                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Update package.json                                          │
│    • name: "my-app"                                             │
│    • dependencies.mkolbol:                                      │
│      - local:   "/path/to/mkolbol"                              │
│      - tarball: "./mkolbol-0.2.0.tgz"                           │
│      - git:     "github:anteew/mkolbol#v0.2.0"                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Personalize README                                           │
│    • Replace "hello-calculator" → "my-app"                      │
│    • Update relative paths for node_modules                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Install Dependencies (if --yes)                              │
│    • cd /tmp/my-app                                             │
│    • npm install                                                │
│    • Stream output if --verbose                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Success Message                                              │
│    ✓ Project 'my-app' bootstrapped successfully!                │
│                                                                 │
│    Next steps:                                                  │
│      cd my-app                                                  │
│      npm run build                                              │
│      npm run test                                               │
│      npx mk run mk.json --dry-run                               │
└─────────────────────────────────────────────────────────────────┘
```

## Template Structure

```
examples/mk/init-templates/
└── hello-calculator/              ← Template root
    ├── .mk/                       ← mkolbol configuration
    │   └── options.json           ← Project options (dev/ci/release)
    ├── src/                       ← Source code
    │   └── index.ts               ← Entry point
    ├── .gitignore                 ← Git ignore patterns
    ├── ACCEPTANCE.md              ← Acceptance criteria
    ├── mk.json                    ← Topology definition
    ├── package.json               ← Package manifest (personalized)
    ├── README.md                  ← Documentation (personalized)
    └── tsconfig.json              ← TypeScript config
```

## Source Options

### Local Source (Development)

```typescript
// Configuration
{ source: 'local' }

// Result in package.json
{
  "dependencies": {
    "mkolbol": "/absolute/path/to/mkolbol/repo"
  }
}

// Benefits
- Immediate access to changes
- Hot reload during development
- No build/pack required
```

### Tarball Source (Distribution)

```typescript
// Configuration
{
  source: 'tarball',
  tarballPath: './mkolbol-0.2.0-rfc.tgz'  // Optional
}

// Result in package.json
{
  "dependencies": {
    "mkolbol": "/path/to/mkolbol-0.2.0-rfc.tgz"
  }
}

// Auto-detection
// If tarballPath not provided, searches for *.tgz in repo root

// Benefits
- Exact version control
- Offline installation
- Reproducible builds
```

### Git Source (Published)

```typescript
// Configuration
{
  source: 'git',
  gitTag: 'v0.2.0'  // Default: 'main'
}

// Result in package.json
{
  "dependencies": {
    "mkolbol": "github:anteew/mkolbol#v0.2.0"
  }
}

// Benefits
- Always up-to-date
- Easy version management
- CI/CD friendly
```

## Module Architecture

```
src/mk/bootstrap.ts
│
├── bootstrapProject(appDir, options)
│   ├── Validate inputs
│   ├── Create directory
│   ├── Copy template
│   ├── updatePackageJson()
│   │   ├── Parse existing package.json
│   │   ├── Set project name
│   │   └── Configure mkolbol dependency
│   ├── updateReadme()
│   │   └── Replace template variables
│   └── installDependencies()
│       └── spawn('npm', ['install'])
│
└── listTemplates()
    ├── Read templates directory
    ├── Parse package.json for each
    └── Return metadata array
```

## CLI Handler Flow

```
scripts/mk.ts
│
└── Command: 'bootstrap'
    ├── Parse positional args
    │   └── appDir = args[0]
    ├── Parse flags
    │   ├── --yes / -y
    │   ├── --verbose
    │   ├── --template <name>
    │   ├── --source <type>
    │   ├── --git-tag <tag>
    │   └── --tarball <path>
    ├── Validate required args
    ├── Dynamic import bootstrap module
    │   └── const { bootstrapProject } = await import('../src/mk/bootstrap.js')
    └── Execute with options
        └── await bootstrapProject(appDir, { yes, verbose, ... })
```

## Error Handling

```
┌──────────────────────────┐
│ Directory exists?        │
├──────────────────────────┤
│ Error: Directory 'foo'   │
│ already exists. Please   │
│ choose a different name  │
└──────────────────────────┘

┌──────────────────────────┐
│ Template not found?      │
├──────────────────────────┤
│ Error: Template 'xyz'    │
│ not found at path/...    │
└──────────────────────────┘

┌──────────────────────────┐
│ No tarball found?        │
├──────────────────────────┤
│ Error: No mkolbol        │
│ tarball found. Run       │
│ npm pack first.          │
└──────────────────────────┘

┌──────────────────────────┐
│ npm install fails?       │
├──────────────────────────┤
│ Error: npm install       │
│ failed with code 1       │
└──────────────────────────┘
```

## Testing Strategy

### Unit Tests (mkBootstrap.spec.ts)

```
Test Suites
│
├── bootstrapProject()
│   ├── Basic project creation
│   ├── Package.json updates
│   ├── Dependency configuration (local/git/tarball)
│   ├── README personalization
│   ├── Error handling (exists, not found)
│   ├── Verbose mode
│   └── File structure validation
│
├── listTemplates()
│   ├── Returns template array
│   ├── Includes known templates
│   └── Contains metadata
│
└── Options Testing
    ├── Source selection
    ├── Template selection
    └── Installation flags
```

### Integration Testing

```bash
# Real-world workflow tests
$ mk bootstrap /tmp/test-app --yes
$ cd /tmp/test-app
$ npm run build
$ npx mk --version
$ npx mk run mk.json --dry-run
```

## Extension Points

### Adding New Templates

```bash
# 1. Create template directory
mkdir -p examples/mk/init-templates/my-template

# 2. Add required files
cd examples/mk/init-templates/my-template
# Create package.json, mk.json, src/, etc.

# 3. Test
mk bootstrap /tmp/test --template my-template --yes

# 4. Verify
cd /tmp/test
npm run build
```

### Custom Bootstrap Logic

```typescript
// Future: Add hooks for custom logic
export interface BootstrapHooks {
  beforeCopy?: (targetDir: string) => Promise<void>;
  afterCopy?: (targetDir: string) => Promise<void>;
  beforeInstall?: (targetDir: string) => Promise<void>;
  afterInstall?: (targetDir: string) => Promise<void>;
}
```

### Template Variables

```typescript
// Future: Support more template variables
interface TemplateContext {
  projectName: string;
  author?: string;
  license?: string;
  version?: string;
  description?: string;
  repository?: string;
}

// Usage in templates
// package.json.tmpl
{
  "name": "{{projectName}}",
  "author": "{{author}}",
  "license": "{{license}}"
}
```

## Performance Considerations

- **Template copying**: Uses `fs/promises.cp` with recursive option (fast)
- **Dependency installation**: Only with `--yes` flag (user choice)
- **No bundling**: Templates stored as-is (no compression/extraction)
- **Async operations**: All I/O is async/await
- **Error fail-fast**: Validates before copying files

## Security Considerations

- **Path validation**: Resolves absolute paths, prevents traversal
- **Template validation**: Checks existence before copying
- **Dependency sources**:
  - Local: Uses absolute path (no execution)
  - Git: Standard npm syntax (validated by npm)
  - Tarball: File path (validated by npm)
- **No code execution**: Templates are static files
- **npm install**: Only if user explicitly passes `--yes`
