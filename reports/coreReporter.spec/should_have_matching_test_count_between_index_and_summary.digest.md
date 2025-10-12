# Digest: should_have_matching_test_count_between_index_and_summary

**Status**: fail
**Duration**: 8ms
**Location**: /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:0
**Error**: expected 1 to be greater than or equal to 150

## Summary
- Total Events: 4
- Included Events: 2
- Budget Used: 1981 / 10240 bytes

## Suspects
- **Score: 80.0** - case.end (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:07:19.774Z
- **Score: 80.0** - test.error (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:07:19.773Z
- **Score: 30.0** - test.run (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:07:19.772Z
- **Score: 30.0** - case.begin (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:07:19.771Z

## Code Frames
```
  at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:240:35
  238 |       const summaryContent = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  239 |       const summaryLines = summaryContent.trim().split('\n');
> 240 |       expect(summaryLines.length).toBeGreaterThanOrEqual(indexData.totalTests);
                                        ^
  241 |     });
  242 | 
```

## Events
```json
{"ts":1760292439773,"lvl":"error","case":"should have matching test count between index and summary","phase":"execution","evt":"test.error","payload":{"message":"expected 1 to be greater than or equal to 150","stack":"AssertionError: expected 1 to be greater than or equal to 150\n    at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:240:35\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:135:14\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:60:26\n    at runTest (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:781:17)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runFiles (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:958:5)\n    at startTests (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:967:3)\n    at file:///srv/repos0/mkolbol/node_modules/vitest/dist/chunks/runtime-runBaseTests.oAvMKtQC.js:116:7"}}
{"ts":1760292439774,"lvl":"error","case":"should have matching test count between index and summary","phase":"teardown","evt":"case.end","payload":{"duration":8,"status":"failed"}}
```