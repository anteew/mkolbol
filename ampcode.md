```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "A", "parallel": true, "tasks": ["T8201", "T8301"] },
    { "id": "B", "parallel": true, "depends_on": ["A"], "tasks": ["T8202", "T8302"] },
    { "id": "C", "parallel": true, "depends_on": ["B"], "tasks": ["T8203", "T8303"] }
  ],
  "tasks": [
    { "id": "T8201", "agent": "susan", "title": "StdIO external path: example + docs", "deliverables": ["patches/DIFF_T8201_stdio-example-docs.patch"] },
    { "id": "T8202", "agent": "susan", "title": "StdIO wrapper tests (forks lane)", "deliverables": ["patches/DIFF_T8202_stdio-tests.patch"] },
    { "id": "T8203", "agent": "susan", "title": "mkctl endpoints: show stdio server metadata", "deliverables": ["patches/DIFF_T8203_mkctl-stdio-endpoints.patch"] },
    { "id": "T8301", "agent": "susan", "title": "KeyboardInput module (TTY)", "deliverables": ["patches/DIFF_T8301_keyboard-module.patch"] },
    { "id": "T8302", "agent": "susan", "title": "KeyboardInput tests + demo wiring", "deliverables": ["patches/DIFF_T8302_keyboard-tests-demo.patch"] },
    { "id": "T8303", "agent": "susan", "title": "Docs: interactive topology (keyboard → pty → tty)", "deliverables": ["patches/DIFF_T8303_keyboard-docs.patch"] }
  ]
}
```

# Sprint — SB-MK-DOGFOOD-P1 (StdIO path + Keyboard Input)

Architect: VEGA
Role: Susan (code-forward)
Reporting: Append results to ampcode.log; deliver diffs under patches/ as listed.

Goals
- Validate third‑party CLI integration via StdIO path (no PTY).
- Provide local interactive runs via Keyboard → PTY → TTY renderer.

Constraints
- No kernel changes; reuse existing wrappers/modules; add only examples/docs/tests.

Waves
- A (parallel): T8201 StdIO example/docs; T8301 Keyboard module
- B (after A, parallel): T8202 StdIO tests; T8302 Keyboard tests+demo
- C (after B, parallel): T8203 mkctl endpoints for stdio; T8303 docs for interactive topology

Task Summaries
- T8201 StdIO example + docs
  - Files: create src/examples/stdio-echo-demo.ts; docs/devex/stdio-path.md; update README with link
  - Verify: npm run build && node dist/examples/stdio-echo-demo.js prints round‑trip and exits
- T8202 StdIO wrapper tests (forks lane)
  - Files: create tests/integration/stdioPath.spec.ts
  - Verify: npm run test:pty includes/passes spec (roundtrip, drain, lifecycle, Hostess endpoint type: external, metadata.ioMode: stdio)
- T8203 mkctl endpoints shows stdio metadata
  - Files: adjust CLI/listing (dist/scripts/mkctl.js or src/scripts/mkctl.ts) and README snippet
- T8301 KeyboardInput module
  - Files: create src/modules/keyboard-input.ts; start() raw-mode only if TTY; stop() restore
- T8302 Keyboard tests + demo
  - Files: create tests/modules/keyboardInput.spec.ts; src/examples/keyboard-pty-tty.ts (Keyboard → PTY → TTY)
  - Verify: npm run build && node dist/examples/keyboard-pty-tty.js echoes keystrokes (or exits with message if stdin not TTY)
- T8303 Docs: interactive topology
  - Files: docs/devex/interactive-topology.md; README link

Quality Bar
- Tests deterministic and green across lanes; no flaky sleeps; no kernel edits.
- Minimal, focused diffs; copy‑pasteable docs.
