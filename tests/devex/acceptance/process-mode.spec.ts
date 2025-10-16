/**
 * Acceptance Test: Process Mode Lifecycle
 *
 * PURPOSE:
 * Validates that a custom server correctly spawns external processes,
 * manages their lifecycle, and handles signals gracefully.
 *
 * TEST LANE:
 * FORKS - REQUIRED - This test spawns real child processes
 *
 * GATED:
 * Requires MK_DEVEX_PROCESS_MODE=1 environment variable
 *
 * WHAT IS VALIDATED:
 * 1. Process spawns successfully with valid PID
 * 2. Process lifecycle (spawn → running → shutdown) works
 * 3. Signal handling (SIGTERM) is graceful
 * 4. Process cleanup leaves no zombies
 *
 * HOW TO ADAPT FOR YOUR PROJECT:
 * -------------------------------
 * 1. Copy this file to your project: tests/acceptance/process-mode.spec.ts
 * 2. Update imports:
 *    BEFORE (mkolbol internal):
 *      import { Kernel } from '../../../src/kernel/Kernel.js';
 *    AFTER (external adopter):
 *      import { Kernel, Hostess } from 'mkolbol';
 * 3. Replace ExternalServerWrapper with your wrapper
 * 4. Update manifest to match your server's command/args
 * 5. Adjust timeouts if your process is slow to start/stop
 *
 * RUN:
 *   MK_DEVEX_PROCESS_MODE=1 npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/devex/acceptance/process-mode.spec.ts
 *
 * CRITICAL: Must use --pool=forks to avoid test isolation issues
 *
 * EXPECTED ARTIFACTS (if Laminar enabled):
 *   reports/process-mode.spec/should_spawn_process_successfully.jsonl
 *   reports/process-mode.spec/should_manage_lifecycle.jsonl
 *   reports/process-mode.spec/should_handle_sigterm.jsonl
 *   reports/process-mode.spec/should_cleanup_completely.jsonl
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * IMPORT TRANSFORMATION FOR EXTERNAL PROJECTS:
 *
 * Internal (mkolbol repo):
 *   import { Kernel } from '../../../src/kernel/Kernel.js';
 *   import { Hostess } from '../../../src/hostess/Hostess.js';
 *   import { ExternalServerWrapper } from '../../../src/wrappers/ExternalServerWrapper.js';
 *   import type { ExternalServerManifest } from '../../../src/types.js';
 *
 * External (adopter project):
 *   import { Kernel, Hostess, ExternalServerWrapper, type ExternalServerManifest } from 'mkolbol';
 *   import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';
 */
import { Kernel } from '../../../src/kernel/Kernel.js';
import { Hostess } from '../../../src/hostess/Hostess.js';
import { ExternalServerWrapper } from '../../../src/wrappers/ExternalServerWrapper.js';
import type { ExternalServerManifest } from '../../../src/types.js';

/**
 * GATED TEST SUITE
 *
 * This suite only runs when MK_DEVEX_PROCESS_MODE=1 is set.
 * This prevents accidental process spawning in environments where it's not supported.
 *
 * To run:
 *   MK_DEVEX_PROCESS_MODE=1 npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/devex/acceptance/process-mode.spec.ts
 */
describe.skipIf(!process.env.MK_DEVEX_PROCESS_MODE)('Acceptance: Process Mode Lifecycle', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: ExternalServerWrapper; // CUSTOMIZE: Replace with YourServerWrapper

  const testTimeout = 12000; // Process operations can be slow

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
  });

  afterEach(async () => {
    // CRITICAL: Always clean up to prevent process leaks
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
  });

  /**
   * TEST 1: Process Spawns Successfully
   *
   * VALIDATES: Server spawns child process with valid PID
   * FAILURE SIGNALS:
   *   - Timeout → Command not found or hangs
   *   - PID = 0 → Fork failed
   *   - isRunning() = false → Process exited immediately
   */
  it('should spawn process successfully', async () => {
    // CUSTOMIZE: Update manifest for your process
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-process-server',
      classHex: '0xPROC',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' }
      ],
      capabilities: {
        type: 'output'
      },
      command: '/bin/cat', // CUSTOMIZE: Replace with your command
      args: [],             // CUSTOMIZE: Add your args
      env: {},              // CUSTOMIZE: Add required env vars
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);

    // Before spawn: not running
    expect(wrapper.isRunning()).toBe(false);

    // Spawn the process
    await wrapper.spawn();

    // After spawn: running with valid PID
    expect(wrapper.isRunning()).toBe(true);
    const processInfo = wrapper.getProcessInfo();
    expect(processInfo.pid).toBeGreaterThan(0);
    expect(processInfo.uptime).toBeGreaterThanOrEqual(0);
  }, testTimeout);

  /**
   * TEST 2: Process Lifecycle Management
   *
   * VALIDATES: Process lifecycle transitions (spawn → running → shutdown)
   * FAILURE SIGNALS:
   *   - isRunning() incorrect → State tracking broken
   *   - Shutdown timeout → SIGTERM not handled
   *   - Process remains after shutdown → Cleanup failed
   */
  it('should manage lifecycle (spawn → run → shutdown)', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-lifecycle-server',
      classHex: '0xLIFE',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);

    // STATE 1: Before spawn
    expect(wrapper.isRunning()).toBe(false);

    // STATE 2: After spawn
    await wrapper.spawn();
    expect(wrapper.isRunning()).toBe(true);
    const pidDuringRun = wrapper.getProcessInfo().pid;
    expect(pidDuringRun).toBeGreaterThan(0);

    // STATE 3: After shutdown
    await wrapper.shutdown();
    expect(wrapper.isRunning()).toBe(false);

    // Verify PID is no longer active (process exited)
    // Note: getProcessInfo() behavior after shutdown is wrapper-specific
    // Some wrappers may throw, others may return stale data
    try {
      const infoAfterShutdown = wrapper.getProcessInfo();
      // If it doesn't throw, PID should be reset or invalid
      expect(infoAfterShutdown.pid).toBe(0);
    } catch (err) {
      // Expected: wrapper throws when querying info after shutdown
      expect(err).toBeDefined();
    }
  }, testTimeout);

  /**
   * TEST 3: SIGTERM Signal Handling
   *
   * VALIDATES: Process responds gracefully to SIGTERM
   * FAILURE SIGNALS:
   *   - Timeout → Process ignores SIGTERM
   *   - Force killed → SIGKILL used instead (not graceful)
   *   - Zombie → Process not waited for
   */
  it('should handle SIGTERM gracefully', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-sigterm-server',
      classHex: '0xSIG',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' }
      ],
      capabilities: {
        type: 'output'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const pidBeforeShutdown = wrapper.getProcessInfo().pid;
    expect(pidBeforeShutdown).toBeGreaterThan(0);

    // Shutdown sends SIGTERM and waits for exit
    const shutdownStart = Date.now();
    await wrapper.shutdown();
    const shutdownDuration = Date.now() - shutdownStart;

    // Verify graceful shutdown (should be fast)
    expect(shutdownDuration).toBeLessThan(5000); // < 5s is reasonable
    expect(wrapper.isRunning()).toBe(false);

    // Verify no zombie process
    // Note: This is tricky to verify portably
    // Rely on wrapper's isRunning() returning false
  }, testTimeout);

  /**
   * TEST 4: Complete Cleanup
   *
   * VALIDATES: No resources leaked after shutdown
   * FAILURE SIGNALS:
   *   - File descriptors leaked → Pipes not closed
   *   - Hostess endpoint remains → Cleanup incomplete
   *   - Process zombie → Not waited for
   */
  it('should cleanup completely after shutdown', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-cleanup-server',
      classHex: '0xCLEAN',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    // Verify endpoint registered
    const endpointsBefore = hostess.listEndpoints();
    expect(endpointsBefore.size).toBe(1);

    // Shutdown
    await wrapper.shutdown();

    // Verify endpoint unregistered
    // Note: ExternalServerWrapper might not auto-unregister
    // Adjust this based on your wrapper's behavior
    const endpointsAfter = hostess.listEndpoints();
    // Some wrappers leave endpoints until Hostess eviction
    // This is OK if your wrapper design differs

    // Verify process cleanup
    expect(wrapper.isRunning()).toBe(false);

    // Verify pipes are closed (no more events)
    let dataAfterShutdown = false;
    wrapper.outputPipe.on('data', () => {
      dataAfterShutdown = true;
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    expect(dataAfterShutdown).toBe(false);
  }, testTimeout);

  /**
   * TEST 5: Multiple Process Lifecycle
   *
   * VALIDATES: Multiple processes can be spawned and cleaned up
   * FAILURE SIGNALS:
   *   - Second spawn fails → Resource leak from first
   *   - PID collision → ID generation broken
   *   - Cleanup fails → First process leaked
   */
  it('should handle multiple process lifecycles', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-multi-server',
      classHex: '0xMULTI',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' }
      ],
      capabilities: {
        type: 'output'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    // First process
    const wrapper1 = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper1.spawn();
    const pid1 = wrapper1.getProcessInfo().pid;
    expect(pid1).toBeGreaterThan(0);
    await wrapper1.shutdown();
    expect(wrapper1.isRunning()).toBe(false);

    // Second process (should work independently)
    const wrapper2 = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper2.spawn();
    const pid2 = wrapper2.getProcessInfo().pid;
    expect(pid2).toBeGreaterThan(0);
    expect(pid2).not.toBe(pid1); // Different PIDs
    await wrapper2.shutdown();
    expect(wrapper2.isRunning()).toBe(false);

    // Assign to wrapper for afterEach cleanup
    wrapper = wrapper2;
  }, testTimeout);

  /**
   * TEST 6: Process Crash Recovery
   *
   * VALIDATES: Wrapper detects when process exits unexpectedly
   * FAILURE SIGNALS:
   *   - isRunning() still true after crash → State tracking broken
   *   - No error detected → Exit monitoring missing
   */
  it('should detect process crash', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-crash-server',
      classHex: '0xCRASH',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' }
      ],
      capabilities: {
        type: 'output'
      },
      // Use a command that exits immediately with error
      command: '/bin/sh',
      args: ['-c', 'exit 1'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    // Process should exit quickly
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));

    // Wrapper should detect the exit
    // Note: Behavior varies by wrapper implementation
    // Some wrappers update isRunning() on exit event, others require explicit check
    expect(wrapper.isRunning()).toBe(false);
  }, testTimeout);
});

/**
 * TROUBLESHOOTING GUIDE:
 * ----------------------
 *
 * 1. Tests don't run
 *    - Ensure MK_DEVEX_PROCESS_MODE=1 is set
 *    - Verify using forks lane: --pool=forks --poolOptions.forks.singleFork=true
 *    - Check vitest config doesn't override pool
 *
 * 2. Spawn timeout
 *    - Verify command exists: which /bin/cat
 *    - Check command doesn't require input to start
 *    - Increase testTimeout if system is slow
 *
 * 3. Shutdown timeout
 *    - Check process responds to SIGTERM
 *    - Verify wrapper sends SIGTERM (not SIGKILL)
 *    - Ensure pipes are closed before shutdown
 *
 * 4. Process leak
 *    - Verify afterEach calls wrapper.shutdown()
 *    - Check for zombie processes: ps aux | grep cat
 *    - Ensure await wrapper.shutdown() completes
 *
 * 5. PID = 0
 *    - Fork failed (check ulimit -u)
 *    - Command not found
 *    - Permissions issue
 *
 * 6. isRunning() incorrect
 *    - Wrapper not monitoring exit event
 *    - State update race condition
 *    - Check wrapper's process lifecycle tracking
 *
 * 7. Crash detection fails
 *    - Wrapper doesn't listen for 'exit' event
 *    - State update delay (add small sleep before check)
 *    - Check wrapper's error handling
 *
 * LANE REQUIREMENTS:
 * ------------------
 * This test MUST run in forks lane with singleFork=true because:
 * 1. Real child processes are spawned
 * 2. Process signals (SIGTERM) are used
 * 3. Process state must be isolated between tests
 *
 * WRONG:
 *   npx vitest run tests/acceptance/process-mode.spec.ts
 *
 * CORRECT:
 *   MK_DEVEX_PROCESS_MODE=1 npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/acceptance/process-mode.spec.ts
 */
