# Sprint 6: DX, CLI, and Examples

Scope

- Improve developer experience with CLI tools, templates, and richer examples.
- Provide quickstart scaffolds and graph visualization output.

Stories

- CLI:
  - mkolbol dev: run example topologies by name
  - mkolbol graph: print ASCII/JSON graph of current topology via StateManager
  - mkolbol list: list registered modules via Hostess
- Templates:
  - create-module script to scaffold a new transform/source/sink
- Examples:
  - file->uppercase->console
  - timer->tee->sum/log
  - merge of heterogeneous sources

Deliverables

- bin/mkolbol (CLI entry)
- scripts/scaffold-module.ts
- examples/\* expanded with READMEs
- tests/cli/\*.spec.ts for basic commands

Out of Scope

- Browser build and distributed transports (future track).

Demo Checklist

- CLI commands run locally; examples are documented and runnable end-to-end.
