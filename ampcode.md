```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "A", "parallel": false, "tasks": ["T9001", "T9002"] },
    { "id": "B", "parallel": true, "depends_on": ["A"], "tasks": ["T9003", "T9004", "T9005"] }
  ],
  "tasks": [
    { "id": "T9001", "agent": "susan", "title": "ANSI P3: truecolor/256 SGR (38/48;2;r;g;b and 38/48;5;n)", "deliverables": ["patches/DIFF_T9001_parser-truecolor-256.patch"] },
    { "id": "T9002", "agent": "susan", "title": "ANSI P3: resize events + state invariants", "deliverables": ["patches/DIFF_T9002_parser-resize.patch"] },
    { "id": "T9003", "agent": "susan", "title": "ANSI P3: minimal DEC subset (DECAWM, DECSCNM)", "deliverables": ["patches/DIFF_T9003_parser-dec-modes.patch"] },
    { "id": "T9004", "agent": "susan", "title": "Tests + perf guard (color tables, resize, modes)", "deliverables": ["patches/DIFF_T9004_parser-tests-perf.patch"] },
    { "id": "T9005", "agent": "susan", "title": "Docs: update ansi-parser.md (P3)", "deliverables": ["patches/DIFF_T9005_parser-docs-p3.patch"] }
  ]
}
```

# Sprint — SB-MK-ANSI-PARSER-P3

Goal
- Raise ANSI parser fidelity: truecolor/256 SGR, resize events with stable state, and a minimal DEC mode subset, with tests and docs.

Constraints
- No kernel edits; scope limited to src/transforms/AnsiParser.ts, tests, and docs/rfcs/stream-kernel/ansi-parser.md.

Verification
- npm run test:ci — green; new color/resize tests passing; perf guard within documented bounds.
