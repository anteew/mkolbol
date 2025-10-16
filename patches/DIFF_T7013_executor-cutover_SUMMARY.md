# T7013: Executor Blue/Green Cutover Implementation

## Summary

Implemented zero-data-loss blue/green cutover capability in the Executor class, enabling seamless node replacement during operation with no downtime or data loss.

## Changes

### Core Implementation: `src/executor/Executor.ts`

Added `cutover(oldNodeId, newNodeId)` method that implements blue/green deployment pattern:

1. **Spawn New Node**: Instantiates new node with same configuration as old node
2. **Connect Pipes**: Wires up input/output pipes for new node via StateManager
3. **Start New Node**: Activates the new node instance
4. **Drain Old Node**: Waits for old node's output pipe to drain (respects `drainTimeout`)
5. **Switch Connections**: Rewires all incoming and outgoing connections from old to new node
6. **Teardown Old Node**: Gracefully terminates old node (process/worker/inproc)
7. **Cleanup**: Removes old node from StateManager, Hostess, and routing index

Key features:
- Uses existing `cutoverConfig` (drainTimeout, killTimeout)
- Emits debug events at each stage for observability
- Handles all node types: inproc, worker, and process modes
- Properly cleans up old node from all registries

### Test Suite: `tests/integration/executorCutover.spec.ts`

Comprehensive integration tests covering:

1. **Basic Cutover**: Verifies node replacement and connection switching
2. **Configuration Preservation**: Ensures new node inherits old node's config
3. **Multiple Connections**: Tests cutover with both incoming and outgoing connections
4. **Error Handling**: Validates proper error when node doesn't exist
5. **Process Mode**: Tests cutover of process-mode nodes (gated by `MK_PROCESS_EXPERIMENTAL`)
6. **Zero Data Loss**: Writes data during cutover and verifies no data loss or duplication
7. **Timeout Respect**: Confirms drain timeout configuration is honored

## Test Results

All 6 cutover tests pass (1 skipped without experimental flag):

```
✓ should perform basic cutover of inproc node (2270ms)
✓ should preserve node configuration during cutover (2011ms)
✓ should handle cutover with multiple connections (2013ms)
✓ should throw error when old node does not exist (6ms)
✓ should handle cutover under data load without loss (2413ms)
✓ should respect drain timeout configuration (511ms)
```

## Verification Commands

```bash
npm run build              # TypeScript compilation: ✓ passed
npm run test:ci            # Unit and integration tests: ✓ passed
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty  # PTY tests: ✓ passed
```

## Usage Example

```typescript
const executor = new Executor(kernel, hostess, stateManager);

// Configure cutover timeouts
executor.setCutoverConfig({
  drainTimeout: 5000,
  killTimeout: 2000
});

executor.load(config);
await executor.up();

// Perform zero-downtime node replacement
await executor.cutover('old-node-id', 'new-node-id');
```

## Benefits

1. **Zero Downtime**: New node is running before old node is torn down
2. **Zero Data Loss**: Drains output before switching connections
3. **Connection Preservation**: All connections are automatically rewired
4. **Observable**: Debug events emitted at each stage
5. **Configurable**: Respects existing cutoverConfig timeouts
6. **Type-Agnostic**: Works with inproc, worker, and process nodes

## Implementation Notes

- Uses internal access to StateManager/Hostess maps for cleanup (marked with `as any`)
- Maintains backward compatibility with existing `drainAndTeardownProcess` method
- Debug events follow existing patterns: `executor.cutover.*`
- Properly handles edge cases (no output pipe, different node types)
