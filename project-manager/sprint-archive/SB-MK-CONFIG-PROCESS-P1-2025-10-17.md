```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "A", "parallel": false, "tasks": ["T8401", "T8402"] },
    { "id": "B", "parallel": true, "depends_on": ["A"], "tasks": ["T8403", "T8404"] }
  ],
  "tasks": [
    {
      "id": "T8401",
      "agent": "susan",
      "title": "Config schema: add process/external params",
      "deliverables": ["patches/DIFF_T8401_schema-process.patch"]
    },
    {
      "id": "T8402",
      "agent": "susan",
      "title": "Loader + Executor mapping for ExternalProcess",
      "deliverables": ["patches/DIFF_T8402_loader-executor-external.patch"]
    },
    {
      "id": "T8403",
      "agent": "susan",
      "title": "Examples+tests: external from config (stdio/pty)",
      "deliverables": ["patches/DIFF_T8403_examples-tests-external-config.patch"]
    },
    {
      "id": "T8404",
      "agent": "susan",
      "title": "Docs touch-up: wiring guide & README links",
      "deliverables": ["patches/DIFF_T8404_docs-wiring-readme.patch"]
    }
  ]
}
```

# Sprint — SB-MK-CONFIG-PROCESS-P1 (Config loader: process/external servers)

Goal

- Allow early adopters to declare external servers in config (YAML/JSON) and run them via Executor, supporting ioMode: 'stdio' and 'pty'.

Constraints

- Keep kernel untouched; scope to config schema/loader, Executor mapping, examples/tests, mkctl (if needed).

Tasks

- T8401 Schema update
  - Files: src/config/schema.ts — extend runMode to include 'process'; add node.params for external: { command, args, ioMode }.
- T8402 Loader + Executor mapping
  - Files: src/config/loader.ts; src/executor/Executor.ts — if module === 'ExternalProcess' then instantiate ExternalServerWrapper with params; honor ioMode.
- T8403 Examples + tests
  - Files: examples/configs/external-stdio.yaml, external-pty.yaml; tests/integration/externalFromConfig.spec.ts (forks lane).
- T8404 Docs touch-ups
  - Files: docs/devex/wiring-and-tests.md (note ExternalProcess via config); README link to example configs.

Verification

- npm run build
- npm run test:ci (threads) — green
- MK_PROCESS_EXPERIMENTAL=1 npm run test:pty (forks) — green; new externalFromConfig spec included

Acceptance

- External server declared in YAML runs under Executor; roundtrip and endpoints verified in forks lane.
