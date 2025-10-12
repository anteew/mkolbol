# Digest: should_have_error-level_log_for_case_end_of_failed_tests

**Status**: fail
**Duration**: 2ms
**Location**: /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:0
**Error**: expected 'info' to be 'error' // Object.is equality

## Summary
- Total Events: 4
- Included Events: 2
- Budget Used: 1917 / 10240 bytes

## Suspects
- **Score: 80.0** - case.end (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:59:37.966Z
- **Score: 80.0** - test.error (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:59:37.965Z
- **Score: 30.0** - test.run (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:59:37.964Z
- **Score: 30.0** - case.begin (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:59:37.963Z

## Code Frames
```
  at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:226:31
  224 |         
  225 |         const endEvent = lines.find(e => e.evt === 'case.end');
> 226 |         expect(endEvent?.lvl).toBe('error');
                                    ^
  227 |         expect(endEvent?.payload?.status).toBe('failed');
  228 |       }
```

## Events
```json
{"ts":1760295577965,"lvl":"error","case":"should have error-level log for case.end of failed tests","phase":"execution","evt":"test.error","payload":{"message":"expected 'info' to be 'error' // Object.is equality","stack":"AssertionError: expected 'info' to be 'error' // Object.is equality\n    at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:226:31\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:135:14\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:60:26\n    at runTest (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:781:17)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runFiles (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:958:5)\n    at startTests (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:967:3)\n    at file:///srv/repos0/mkolbol/node_modules/vitest/dist/chunks/runtime-runBaseTests.oAvMKtQC.js:116:7"}}
{"ts":1760295577966,"lvl":"error","case":"should have error-level log for case.end of failed tests","phase":"teardown","evt":"case.end","payload":{"duration":2,"status":"failed"}}
```