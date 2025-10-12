# Digest: should_have_matching_test_count_between_index_and_summary

**Status**: fail
**Duration**: 6ms
**Location**: /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:0
**Error**: expected 1 to be greater than or equal to 243

## Summary
- Total Events: 4
- Included Events: 2
- Budget Used: 1981 / 10240 bytes

## Suspects
- **Score: 80.0** - case.end (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T19:00:20.994Z
- **Score: 80.0** - test.error (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T19:00:20.993Z
- **Score: 30.0** - test.run (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T19:00:20.992Z
- **Score: 30.0** - case.begin (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T19:00:20.991Z

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
{"ts":1760295620993,"lvl":"error","case":"should have matching test count between index and summary","phase":"execution","evt":"test.error","payload":{"message":"expected 1 to be greater than or equal to 243","stack":"AssertionError: expected 1 to be greater than or equal to 243\n    at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:240:35\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:135:14\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:60:26\n    at runTest (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:781:17)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runFiles (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:958:5)\n    at startTests (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:967:3)\n    at file:///srv/repos0/mkolbol/node_modules/vitest/dist/chunks/runtime-runBaseTests.oAvMKtQC.js:116:7"}}
{"ts":1760295620994,"lvl":"error","case":"should have matching test count between index and summary","phase":"teardown","evt":"case.end","payload":{"duration":6,"status":"failed"}}
```