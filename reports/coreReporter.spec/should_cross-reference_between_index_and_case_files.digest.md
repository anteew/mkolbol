# Digest: should_cross-reference_between_index_and_case_files

**Status**: fail
**Duration**: 3ms
**Location**: /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:0
**Error**: expected +0 to be 1 // Object.is equality

## Summary
- Total Events: 4
- Included Events: 2
- Budget Used: 2396 / 10240 bytes

## Suspects
- **Score: 80.0** - case.end (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T19:00:05.853Z
- **Score: 80.0** - test.error (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T19:00:05.852Z
- **Score: 30.0** - test.run (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T19:00:05.851Z
- **Score: 30.0** - case.begin (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T19:00:05.850Z

## Code Frames
```
  at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:261:47
  259 |           
  260 |           const endEvent = events.find(e => e.evt === 'case.end');
> 261 |           expect(endEvent?.payload?.duration).toBe(entry.duration);
                                                    ^
  262 |         }
  263 |       });
```

```
  at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:253:39
  251 | 
  252 |     it('should cross-reference between index and case files', () => {
> 253 |       indexData.artifacts.slice(0, 5).forEach((entry) => {
                                            ^
  254 |         if (entry.artifacts.caseFile) {
  255 |           expect(fs.existsSync(entry.artifacts.caseFile)).toBe(true);
```

## Events
```json
{"ts":1760295605852,"lvl":"error","case":"should cross-reference between index and case files","phase":"execution","evt":"test.error","payload":{"message":"expected +0 to be 1 // Object.is equality","stack":"AssertionError: expected +0 to be 1 // Object.is equality\n    at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:261:47\n    at Array.forEach (<anonymous>)\n    at /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts:253:39\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:135:14\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:60:26\n    at runTest (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:781:17)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runFiles (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:958:5)"}}
{"ts":1760295605853,"lvl":"error","case":"should cross-reference between index and case files","phase":"teardown","evt":"case.end","payload":{"duration":3,"status":"failed"}}
```