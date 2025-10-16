# T8302: KeyboardInput Tests + Demo Wiring

## Files Created

1. **tests/modules/keyboardInput.spec.ts** - Comprehensive test suite for KeyboardInput
2. **src/examples/keyboard-pty-tty.ts** - Demo showing Keyboard → PTY → TTY pipeline

## Test Coverage

The test suite includes 15 tests covering:

### TTY Detection (3 tests)
- Emits error when stdin is not a TTY
- Does not activate without TTY
- Activates correctly when TTY is available

### Raw Mode Enable/Restore (5 tests)
- Enables raw mode when starting
- Stores original raw mode state
- Restores original raw mode when stopping
- Handles missing setRawMode gracefully
- Does not call setRawMode when stopping if not started

### Keypress Events (7 tests)
- Emits keypress event for regular keys
- Handles ctrl modifier correctly
- Handles meta and shift modifiers
- Emits ctrl-c event and stops on Ctrl+C
- Does not emit events after stop
- Handles multiple start calls gracefully
- Handles special keys (e.g., return)

## Demo Behavior

The demo creates a pipeline: KeyboardInput → PTY (running /bin/cat) → stdout

**Without TTY:**
```
[keyboard-pty-tty] No TTY available. This demo requires an interactive terminal.
[keyboard-pty-tty] Please run this demo in a terminal with TTY support.
```

**With TTY:**
- Shows startup message
- Echoes all keystrokes through the PTY pipeline
- Exits cleanly on Ctrl+C with shutdown message
- Handles SIGINT and SIGTERM gracefully

## Verification Results

✅ All 15 tests pass
✅ Build completes successfully
✅ Demo exits gracefully without TTY
✅ Demo ready for interactive testing with TTY

## Usage

```bash
# Run tests
npm test tests/modules/keyboardInput.spec.ts

# Run demo (requires interactive terminal)
node dist/src/examples/keyboard-pty-tty.js
```

## Patch File

Location: `patches/DIFF_T8302_keyboard-tests-demo.patch`
Lines: 387
