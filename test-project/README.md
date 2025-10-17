# test-project

A simple mkolbol topology demonstrating calculator server with TTY rendering and logging.

## Quick Start

```bash
# Run the topology
mk run --file mk.json --duration 10

# Test the calculator
curl -s "http://localhost:4000/add?a=5&b=3"
# → {"result": 8.00}

curl -s "http://localhost:4000/subtract?a=10&b=4"
# → {"result": 6.00}
```

## What It Does

This topology demonstrates:

- **CalculatorServer**: HTTP server with /add and /subtract endpoints
- **XtermTTYRenderer**: Live terminal output rendering
- **FilesystemSink**: Persistent logging to `logs/calculator.jsonl`

```
CalculatorServer → XtermTTYRenderer (live output)
                 → FilesystemSink     (persistent logs)
```

## Development Workflow

### Run with hot reload

```bash
mk dev --file mk.json
```

### View logs

```bash
# Live tail
mk logs --module calculator --follow

# Filter by level
mk logs --level error --json
```

### Trace performance

```bash
mk trace --file mk.json --duration 30 --top 5
```

### Validate health

```bash
mk doctor --file mk.json
```

## Build & Package

### Build artifacts

```bash
mk build --target production
```

### Create distributable package

```bash
mk package --sign
```

### Generate CI config

```bash
mk ci plan --output --with-laminar
```

## Configuration

### Topology (mk.json)

- **Port**: 4000 (change in `mk.json`)
- **Precision**: 2 decimal places
- **Log path**: `logs/calculator.jsonl`

### Profiles (.mk/options.json)

- **dev**: Hot reload enabled, debug logging
- **ci**: No reload, info logging, test matrix
- **release**: Minified, distributed routing

## Testing

```bash
# Run tests with Laminar
npm run test:ci

# Generate failure digests
npx lam digest

# View test summary
npx lam summary
```

## Learn More

- [mkolbol Documentation](https://github.com/anteew/mkolbol)
- [mk dev/logs/trace Guide](../../docs/devex/mk-dev-logs-trace.md)
- [Authoring a Module](../../docs/devex/authoring-a-module.md)
- [Recipes](../../docs/devex/recipes.md)
