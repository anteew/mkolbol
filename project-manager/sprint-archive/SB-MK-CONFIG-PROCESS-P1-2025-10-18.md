```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "A", "parallel": false, "tasks": ["T8801", "T8802"] },
    { "id": "B", "parallel": true, "depends_on": ["A"], "tasks": ["T8811", "T8812", "T8813"] }
  ],
  "tasks": [
    {
      "id": "T8801",
      "agent": "susan",
      "title": "mkctl run --file <config> (wrap config-runner)",
      "deliverables": ["patches/DIFF_T8801_mkctl-run.patch"]
    },
    {
      "id": "T8802",
      "agent": "susan",
      "title": "CLI tests + example configs for mkctl run",
      "deliverables": ["patches/DIFF_T8802_mkctl-tests-examples.patch"]
    },
    {
      "id": "T8811",
      "agent": "susan",
      "title": "ANSI Parser P3 — truecolor/256 SGR",
      "deliverables": ["patches/DIFF_T8811_parser-truecolor-256.patch"]
    },
    {
      "id": "T8812",
      "agent": "susan",
      "title": "ANSI Parser P3 — resize events + DEC subset",
      "deliverables": ["patches/DIFF_T8812_parser-resize-dec.patch"]
    },
    {
      "id": "T8813",
      "agent": "susan",
      "title": "Parser P3 tests + perf guard + docs",
      "deliverables": ["patches/DIFF_T8813_parser-tests-docs.patch"]
    }
  ]
}
```

# Sprint — SB-MK-MKCTL-RUN-P1 + SB-MK-ANSI-PARSER-P3

Goal

- Add mkctl run to execute a topology from YAML/JSON quickly, and raise ANSI parser fidelity (truecolor/256; resize; DEC subset) with tests and docs.

Constraints

- No kernel edits; scope to scripts/mkctl.ts, examples/configs, src/transforms/AnsiParser.ts and tests/docs.

Verification

- mkctl run: npm run build && node dist/scripts/mkctl.js run --file examples/configs/external-stdio.yaml (exits 0; runs 5s)
- Parser P3: npm run test:ci (threads) green; perf within documented bounds; new color/resize tests pass.
