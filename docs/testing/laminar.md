# Laminar — Structured Flow Testing

Laminar is a branded, structured testing system for flow‑based applications. It produces compact human summaries and deep JSONL artifacts that agents and humans can query precisely without blowing token budgets.

## Why Laminar
- Token‑cheap: short summaries, deep artifacts on disk
- Deterministic: seeded, no flaky sleeps, reproducible
- Composable: unit → component → integration → e2e
- Inspectable: JSONL events with a stable envelope schema
- Portable: reuse across projects; same reporter/CLI

## Event Envelope (JSONL)
Every event is a single JSON object per line with stable keys:

- `ts`: number (epoch ms)
- `lvl`: 'info' | 'warn' | 'error'
- `case`: string (test id)
- `phase`: 'arrange' | 'act' | 'assert' | 'teardown'
- `evt`: string (domain event, e.g., 'connect', 'worker.ready', 'assert.fail')
- `id`: string (event id)
- `corr`: string (correlation id)
- `path`: string (`file:line`)
- `payload`: object (domain‑specific)

## Artifacts & Layout
- `reports/summary.jsonl` — one line per test (status, duration, pointers)
- `reports/<suite>/<case>.jsonl` — event stream for the case
- `reports/<suite>/<case>.snap/` — optional golden snapshots (transcripts)

## CLI: logq
A tiny CLI to slice/filter JSONL by fields and windows.

Examples:
- `logq failures` — list only failures with pointers
- `logq case topology.rewire --around assert.fail --window 50` — ±50 events
- `logq grep evt=worker.ready` — list readiness events
- `logq path tests/worker/workerAdapters.spec.ts:61` — events from a code location

## Reporter
Vitest reporter prints compact console lines and writes `reports/summary.jsonl` mapping each test to artifact URIs and correlation IDs.

## Instrumentation (test mode)
Optional hooks emit events from:
- TopologyController (cmd received/applied/snapshot)
- Executor (worker lifecycle; edge wiring)
- Hostess (register/markInUse/markAvailable)
- ControlBus (publish/subscribe metadata)

These hooks are no‑ops in production code paths unless a logger is attached during tests.

## Test Types
- Unit: adapters and small modules
- Component: module + adapters (inproc/worker/process)
- Integration: topology wiring + Controller flows
- Property‑based (seeded)
- Golden transcripts (snapshots + masks)

## CI & Local

### Test Execution Split
CI runs tests in two separate jobs to handle PTY isolation requirements:

1. **`test:ci`** — All tests except PTY tests
   - Uses `--pool=threads` (tinypool worker threads)
   - Excludes: `ptyServerWrapper.spec.ts`, `multiModalOutput.spec.ts`
   - Parallel execution for speed

2. **`test:pty`** — PTY tests only
   - Uses `--pool=forks --poolOptions.forks.singleFork=true`
   - Includes: `ptyServerWrapper.spec.ts`, `multiModalOutput.spec.ts`
   - Single-threaded execution (one fork, no parallelism)

### Why PTY Tests Run Single-Threaded

**Problem**: PTY (pseudo-terminal) tests using `node-pty` have race conditions when run in parallel with tinypool worker threads:
- Signal handling interference (SIGWINCH, SIGHUP, SIGCHLD)
- File descriptor conflicts on `/dev/ptmx`
- Timing issues in terminal session cleanup

**Solution**: PTY tests run in a single fork to ensure complete isolation:
- No concurrent PTY sessions
- Clean signal handling per test
- Deterministic teardown order

### Adding New Tests

**For regular tests** (adapters, topology, workers):
- Add to `tests/` directory
- No special configuration needed
- Runs in `test:ci` by default

**For PTY tests**:
1. Add test file to `tests/wrappers/` or `tests/integration/`
2. Update `test:ci` exclude pattern: `--exclude='**/{ptyServerWrapper,multiModalOutput,yourNewPtyTest}.spec.ts'`
3. Update `test:pty` file list: add explicit path to your new test
4. Document why the test needs PTY isolation

**Local Development**:
- `npm test` — runs all tests (may have PTY race conditions)
- `npm run test:ci` — test the CI-safe subset
- `npm run test:pty` — test only PTY tests (slow, sequential)
- Repro: `node scripts/repro.ts` prints exact filters and `logq` slices

## Branding Notes
Laminar fits the project’s physical‑manifold metaphor: smooth, predictable flow with clear gauges and valves for control.
