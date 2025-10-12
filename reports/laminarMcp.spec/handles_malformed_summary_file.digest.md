# Digest: handles_malformed_summary_file

**Status**: fail
**Duration**: 4ms
**Location**: /srv/repos0/mkolbol/tests/mcp/laminarMcp.spec.ts:0
**Error**: Tool execution failed: Unexpected token 'i', "invalid json" is not valid JSON

## Summary
- Total Events: 4
- Included Events: 2
- Budget Used: 2412 / 10240 bytes

## Suspects
- **Score: 80.0** - case.end (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:57:18.770Z
- **Score: 80.0** - test.error (error)
  - Reasons: error level, close proximity to failure
  - Time: 2025-10-12T18:57:18.769Z
- **Score: 30.0** - test.run (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:57:18.768Z
- **Score: 30.0** - case.begin (info)
  - Reasons: close proximity to failure
  - Time: 2025-10-12T18:57:18.767Z

## Code Frames
```
  at /srv/repos0/mkolbol/src/mcp/laminar/server.ts:610:13
  608 |         throw error;
  609 |       }
> 610 |       throw new McpError(
                  ^
  611 |         McpErrorCode.INTERNAL_ERROR,
  612 |         `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
```

```
  at /srv/repos0/mkolbol/tests/mcp/laminarMcp.spec.ts:566:22
  564 |       fs.writeFileSync(summaryFile, 'invalid json');
  565 | 
> 566 |       const result = await server.callTool('repro', {});
                           ^
  567 |       
  568 |       expect(() => result).not.toThrow();
```

## Events
```json
{"ts":1760295438769,"lvl":"error","case":"handles malformed summary file","phase":"execution","evt":"test.error","payload":{"message":"Tool execution failed: Unexpected token 'i', \"invalid json\" is not valid JSON","stack":"McpError: Tool execution failed: Unexpected token 'i', \"invalid json\" is not valid JSON\n    at LaminarMcpServer.callTool (/srv/repos0/mkolbol/src/mcp/laminar/server.ts:610:13)\n    at /srv/repos0/mkolbol/tests/mcp/laminarMcp.spec.ts:566:22\n    at runTest (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:781:11)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runSuite (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:909:15)\n    at runFiles (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:958:5)\n    at startTests (file:///srv/repos0/mkolbol/node_modules/@vitest/runner/dist/index.js:967:3)\n    at file:///srv/repos0/mkolbol/node_modules/vitest/dist/chunks/runtime-runBaseTests.oAvMKtQC.js:116:7\n    at withEnv (file:///srv/repos0/mkolbol/node_modules/vitest/dist/chunks/runtime-runBaseTests.oAvMKtQC.js:83:5)"}}
{"ts":1760295438770,"lvl":"error","case":"handles malformed summary file","phase":"teardown","evt":"case.end","payload":{"duration":4,"status":"failed"}}
```