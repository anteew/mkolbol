# Digest: validates_required_parameters

**Status**: fail
**Duration**: 16ms
**Location**: /srv/repos0/mkolbol/tests/mcp/laminarMcp.spec.ts:0
**Error**: promise resolved "{ logs: '' }" instead of rejecting

## Summary
- Total Events: 4
- Included Events: 2
- Budget Used: 2389 / 10240 bytes

## Suspects
- **Score: 80.0** - case.end (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:57:18.768Z
- **Score: 80.0** - test.error (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:57:18.767Z
- **Score: 30.0** - test.run (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:57:18.766Z
- **Score: 30.0** - case.begin (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:57:18.765Z

## Code Frames
```
  at /srv/repos0/mkolbol/node_modules/chai/lib/chai/utils/addProperty.js:62:29
  60 |         }
  61 | 
> 62 |         var result = getter.call(this);
                                 ^
  63 |         if (result !== undefined)
  64 |           return result;
```

```
  at /srv/repos0/mkolbol/node_modules/chai/lib/chai/utils/proxify.js:98:22
   96 |       }
   97 | 
>  98 |       return Reflect.get(target, property);
                           ^
   99 |     }
  100 |   });
```

```
  at /srv/repos0/mkolbol/tests/mcp/laminarMcp.spec.ts:455:7
  453 |       await expect(
  454 |         server.callTool('logs.case.get', {})
> 455 |       ).rejects.toThrow(McpError);
            ^
  456 | 
  457 |       await expect(
```

## Events
```json
{"ts":1760295438767,"lvl":"error","case":"validates required parameters","phase":"execution","evt":"test.error","payload":{"message":"promise resolved \"{ logs: '' }\" instead of rejecting","stack":"Error: promise resolved \"{ logs: '' }\" instead of rejecting\n    at Assertion.__VITEST_REJECTS__ (file:///srv/repos0/mkolbol/node_modules/@vitest/expect/dist/index.js:1500:19)\n    at Assertion.propertyGetter (/srv/repos0/mkolbol/node_modules/chai/lib/chai/utils/addProperty.js:62:29)\n    at Reflect.get (<anonymous>)\n    at Object.proxyGetter [as get] (/srv/repos0/mkolbol/node_modules/chai/lib/chai/utils/proxify.js:98:22)\n    at /srv/repos0/mkolbol/tests/mcp/laminarMcp.spec.ts:455:7\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:135:14\n    at file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:60:26\n    at runTest (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:781:17)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)"}}
{"ts":1760295438768,"lvl":"error","case":"validates required parameters","phase":"teardown","evt":"case.end","payload":{"duration":16,"status":"failed"}}
```