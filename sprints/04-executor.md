# Sprint 4: Executor (Local Orchestrator)

Scope
- Load a configuration file (JSON/YAML) describing a topology and bring it up in-process.
- Lifecycle: start, stop, restart nodes/modules.
- Apply wiring via StateManager.
- Health: basic started/stopped status; no heartbeats.

Stories
- Config schema: nodes (module class + params), connections (edges), options.
- Executor class:
  - load(config)
  - up(): instantiate modules, register with Hostess, wire via StateManager
  - down(): orderly teardown
  - restartNode(id)
- Module loader: resolve module constructors from registry or local map.
- Minimal CLI commands: exec up/down from a config file.

Deliverables
- src/executor/Executor.ts
- src/config/schema.ts
- bin/exec (CLI) or npm scripts to run examples
- tests/executor/*.spec.ts
- examples/config/*.json and exec-demo.ts

Out of Scope
- Process isolation, supervision trees, distributed execution.

Demo Checklist
- Run exec up on example config; observe topology comes up and logs data; exec down shuts it off.
