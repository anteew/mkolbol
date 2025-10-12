# Digest: should_include_test_error_events_for_failed_tests

**Status**: fail
**Duration**: 7ms
**Location**: /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:0
**Error**: test.error event should exist for failed test: expected undefined not to be undefined

## Summary
- Total Events: 4
- Included Events: 2
- Budget Used: 2533 / 10240 bytes

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
  at /srv/repos0/mkolbol/node_modules/chai/lib/chai/utils/addMethod.js:57:25
  55 |     }
  56 | 
> 57 |     var result = method.apply(this, arguments);
                             ^
  58 |     if (result !== undefined)
  59 |       return result;
```

```
  at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:212:77
  210 |         
  211 |         const errorEvent = lines.find(e => e.evt === 'test.error');
> 212 |         expect(errorEvent, 'test.error event should exist for failed test').toBeDefined();
                                                                                  ^
  213 |         expect(errorEvent?.lvl).toBe('error');
  214 |         expect(errorEvent?.payload).toBeDefined();
```

## Events
```json
{"ts":1760295577965,"lvl":"error","case":"should include test.error events for failed tests","phase":"execution","evt":"test.error","payload":{"message":"test.error event should exist for failed test: expected undefined not to be undefined","stack":"AssertionError: test.error event should exist for failed test: expected undefined not to be undefined\n    at Proxy.<anonymous> (file:///srv/repos0/mkolbol/node_modules/@vitest/expect/dist/index.js:1102:24)\n    at Proxy.<anonymous> (file:///srv/repos0/mkolbol/node_modules/@vitest/expect/dist/index.js:800:17)\n    at Proxy.methodWrapper (/srv/repos0/mkolbol/node_modules/chai/lib/chai/utils/addMethod.js:57:25)\n    at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:212:77\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:135:14\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:60:26\n    at runTest (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:781:17)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)"}}
{"ts":1760295577966,"lvl":"error","case":"should include test.error events for failed tests","phase":"teardown","evt":"case.end","payload":{"duration":7,"status":"failed"}}
```