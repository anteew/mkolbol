# Early Adopter Examples

This directory contains example implementations and sample applications for early adopters getting started with mkolbol. These examples demonstrate real-world usage patterns and serve as templates for building your own modules.

## Directory Structure

```
examples/early-adopter/
├── README.md                    # This file
├── README_CODEOWNERS.txt        # Attribution and ownership
├── simple-transform/            # Transform module examples (coming soon)
│   ├── uppercase/
│   ├── reverse/
│   └── json-formatter/
├── external-process/            # External process examples (coming soon)
│   ├── python-echo/
│   ├── go-word-count/
│   └── rust-filter/
└── full-topology/               # Complete topology examples (coming soon)
    ├── pty-multi-renderer/
    └── distributed-pipeline/
```

## Getting Started

Before exploring these examples, we recommend:

1. **Read the [Early Adopter Guide](../../docs/devex/early-adopter-guide.md)** - Understand mkolbol's architecture
2. **Complete the [Quickstart](../../docs/devex/quickstart.md)** - Run your first demo
3. **Follow the [First Server Tutorial](../../docs/devex/first-server-tutorial.md)** - Build your first module

## Example Categories

### 1. Simple Transform Modules

In-process TypeScript modules that transform data. Best for:

- Learning the module pattern
- Lightweight processing
- Fast iteration during development

**Coming soon:**

- Uppercase transform
- Text reversal
- JSON formatting and validation

### 2. External Process Modules

Subprocess wrappers for any language. Best for:

- Multi-language support (Python, Go, Rust, etc.)
- Process isolation
- Wrapping existing CLI tools

**Coming soon:**

- Python echo server
- Go word counter
- Rust data filter

### 3. Full Topology Examples

Complete applications with multiple modules. Best for:

- Understanding module composition
- Real-world architecture patterns
- Production deployment reference

**Coming soon:**

- PTY with multiple renderers (screen + canvas + logger)
- Distributed pipeline (source → transform → output)

## Running Examples

Each example directory will contain:

- `README.md` - Specific instructions for that example
- Source files (`*.ts`, `*.py`, `*.go`, etc.)
- Test files (`*.spec.ts`)
- Sample configuration (`topology.yml`)

General pattern:

```bash
cd examples/early-adopter/<example-name>
npm install       # Install dependencies (if needed)
npm run build     # Build TypeScript
npm start         # Run the example
```

## Contributing Your Own Examples

Have a cool module or topology you'd like to share? We welcome contributions!

1. Fork the repository
2. Create your example in a new subdirectory
3. Include:
   - Clear README with prerequisites
   - Well-commented source code
   - Sample input/output
   - Test coverage
4. Submit a pull request

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## Support

If you're stuck or have questions:

- Check the [First Server Tutorial](../../docs/devex/first-server-tutorial.md)
- Review [Module Types RFC](../../docs/rfcs/stream-kernel/03-module-types.md)
- Open an issue: https://github.com/anteew/mkolbol/issues

## Example Status

| Category         | Status  | ETA     |
| ---------------- | ------- | ------- |
| Simple Transform | Planned | Q1 2025 |
| External Process | Planned | Q1 2025 |
| Full Topology    | Planned | Q2 2025 |

Check back soon for complete, runnable examples!

---

**Note**: This directory is specifically for early adopter examples. For mkolbol kernel examples, see `src/examples/`.
