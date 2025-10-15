Sprint SB-MK-CONFIG-LOADER-P1 (P0)

Goal
- Add a minimal, deterministic config loader (YAML/JSON) that produces `TopologyConfig`, with validation, examples, tests, and docs. Keep kernel untouched; reuse existing `Executor.load` and `StateManager` wiring.

Constraints
- Keep dependencies small; prefer a single YAML parser (e.g., `yaml`) and basic structural validation (no heavy schema tooling yet).
- Maintain lane split; tests stay in threads lane.
- Do not change kernel semantics.

T5201 — Config loader module
- Outcome: `src/config/loader.ts` parses YAML or JSON into `TopologyConfig` and performs basic validation (required fields, unique node ids; `from`/`to` address format `node.terminal`).
- DoD:
  - Implement `loadConfig(pathOrString, opts?)` accepting file path or raw string; returns `TopologyConfig`.
  - Add `validateTopology(config)` with structural checks and helpful error messages.
  - Add `yaml` dependency (package.json) if not present.
  - No kernel changes.

T5202 — Tests for loader
- Outcome: Deterministic tests covering success and failure cases.
- DoD:
  - Add `tests/config/loader.spec.ts` with:
    - parses valid YAML and JSON
    - rejects missing `nodes`/`connections`
    - rejects duplicate node ids
    - rejects invalid addresses in `from`/`to`
  - Run in threads lane (included by default).

T5203 — Example configs + runner
- Outcome: Example YAMLs and a tiny runner to demonstrate loading and execution.
- DoD:
  - Add `examples/configs/basic.yml` (Timer→Uppercase→Console) and `multi.yml` variants.
  - Add `src/examples/config-runner.ts` that loads a path, calls `Executor.load`, and brings topology up/down.
  - Build target at `dist/examples/config-runner.js`.

T5204 — README quickstart
- Outcome: README gains a short “Config Loader” section with a minimal YAML and a one-liner to run the example.
- DoD:
  - Add a snippet and command: `node dist/examples/config-runner.js --file examples/configs/basic.yml`.

T5205 — CI wiring
- Outcome: Ensure loader tests run in threads lane.
- DoD:
  - Confirm no changes needed to scripts; otherwise, add `tests/config/loader.spec.ts` to default discovery.

Verification (run locally)
- Build: `npm ci && npm run build`
- Threads lane: `npm run test:ci`
- Example: `node dist/examples/config-runner.js --file examples/configs/basic.yml`

Reporting
- Update ampcode.log with PASS/FAIL per task, file pointers, and the commands above. Note that VEGA handles git (do not branch/commit/push).
