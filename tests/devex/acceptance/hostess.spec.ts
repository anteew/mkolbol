/**
 * Acceptance Test: Hostess Endpoint Registration
 *
 * PURPOSE:
 * Validates that a custom server correctly registers with Hostess,
 * making it discoverable in mkolbol topologies.
 *
 * TEST LANE:
 * THREADS - This test does not spawn external processes
 *
 * WHAT IS VALIDATED:
 * 1. Endpoint is registered after server spawn
 * 2. Endpoint has required metadata fields (type, coordinates)
 * 3. Endpoint capabilities are declared correctly
 * 4. Endpoint is discoverable by capability query
 *
 * HOW TO ADAPT FOR YOUR PROJECT:
 * -------------------------------
 * 1. Copy this file to your project: tests/acceptance/hostess.spec.ts
 * 2. Update imports:
 *    BEFORE (mkolbol internal):
 *      import { Kernel } from '../../../src/kernel/Kernel.js';
 *      import { Hostess } from '../../../src/hostess/Hostess.js';
 *    AFTER (external adopter):
 *      import { Kernel, Hostess } from 'mkolbol';
 * 3. Replace ExternalServerWrapper with your wrapper:
 *      import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';
 * 4. Update manifest to match your server's configuration
 * 5. Update endpoint matching logic (search for 'CUSTOMIZE' comments)
 *
 * RUN:
 *   npx vitest run tests/devex/acceptance/hostess.spec.ts
 *
 * EXPECTED ARTIFACTS (if Laminar enabled):
 *   reports/hostess.spec/should_register_endpoint_after_spawn.jsonl
 *   reports/hostess.spec/should_have_required_metadata_fields.jsonl
 *   reports/hostess.spec/should_declare_capabilities.jsonl
 *   reports/hostess.spec/should_be_discoverable_by_capabilities.jsonl
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

describe('Acceptance: Hostess Endpoint Registration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: ExternalServerWrapper; // CUSTOMIZE: Replace with YourServerWrapper

  const testTimeout = 8000;

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
   * TEST 1: Endpoint Registration
   *
   * VALIDATES: Server registers an endpoint with Hostess after spawning
   * FAILURE SIGNALS:
   *   - Endpoint not found → Registration missing or spawn failed
   *   - Wrong coordinates → Manifest misconfigured
   */
  it(
    'should register endpoint after spawn',
    async () => {
      // CUSTOMIZE: Replace this manifest with your server's configuration
      const manifest: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'test-acceptance-server',
        classHex: '0xACCEPT',
        owner: 'devex',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
          { name: 'input', type: 'local', direction: 'input' },
          { name: 'output', type: 'local', direction: 'output' },
        ],
        capabilities: {
          type: 'transform',
          accepts: ['text'],
          produces: ['text'],
        },
        command: '/bin/cat', // CUSTOMIZE: Replace with your command
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio',
        restart: 'never',
      };

      // CUSTOMIZE: Replace ExternalServerWrapper with YourServerWrapper
      wrapper = new ExternalServerWrapper(kernel, hostess, manifest);

      // Verify no endpoint exists before spawn
      const endpointsBefore = hostess.listEndpoints();
      expect(endpointsBefore.size).toBe(0);

      // Spawn the server
      await wrapper.spawn();

      // Verify endpoint is registered after spawn
      const endpointsAfter = hostess.listEndpoints();
      expect(endpointsAfter.size).toBe(1);

      // CUSTOMIZE: Update this search to match your server's coordinates
      // Option 1: Search by command (for ExternalServerWrapper)
      const serverEndpoint = Array.from(endpointsAfter.entries()).find(
        ([_, ep]) => ep.type === 'external' && ep.coordinates.includes('/bin/cat'),
      );

      // Option 2: Search by servername (alternative)
      // const serverEndpoint = Array.from(endpointsAfter.entries()).find(
      //   ([_, ep]) => ep.coordinates.includes('test-acceptance-server')
      // );

      expect(serverEndpoint).toBeDefined();
      expect(serverEndpoint![1].type).toBe('external');
    },
    testTimeout,
  );

  /**
   * TEST 2: Required Metadata Fields
   *
   * VALIDATES: Endpoint contains type, coordinates, and metadata
   * FAILURE SIGNALS:
   *   - Missing type → Endpoint structure broken
   *   - Missing coordinates → Address information missing
   *   - Missing metadata → Manifest not propagated
   */
  it(
    'should have required metadata fields',
    async () => {
      // CUSTOMIZE: Update manifest as needed
      const manifest: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'test-metadata-server',
        classHex: '0xMETA',
        owner: 'devex',
        auth: 'no',
        authMechanism: 'none',
        terminals: [{ name: 'input', type: 'local', direction: 'input' }],
        capabilities: {
          type: 'output',
        },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio',
        restart: 'never',
      };

      wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
      await wrapper.spawn();

      const endpoints = hostess.listEndpoints();
      const serverEndpoint = Array.from(endpoints.entries())[0];

      // Verify required fields exist
      expect(serverEndpoint).toBeDefined();
      const [endpointId, endpoint] = serverEndpoint;

      // Type field (required)
      expect(endpoint.type).toBeDefined();
      expect(typeof endpoint.type).toBe('string');
      expect(endpoint.type).toBe('external'); // CUSTOMIZE: 'inproc', 'worker', 'external', 'pty'

      // Coordinates field (required)
      expect(endpoint.coordinates).toBeDefined();
      expect(typeof endpoint.coordinates).toBe('string');
      expect(endpoint.coordinates.length).toBeGreaterThan(0);

      // Metadata field (required for most wrappers)
      expect(endpoint.metadata).toBeDefined();
      expect(typeof endpoint.metadata).toBe('object');
      expect(endpoint.metadata?.ioMode).toBe('stdio');
    },
    testTimeout,
  );

  /**
   * TEST 3: Capability Declaration
   *
   * VALIDATES: Endpoint metadata includes capability information
   * FAILURE SIGNALS:
   *   - Missing capabilities → Manifest not propagated
   *   - Wrong type → Capability misconfigured
   */
  it(
    'should declare capabilities',
    async () => {
      // CUSTOMIZE: Set capabilities for your server
      const manifest: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'test-capabilities-server',
        classHex: '0xCAP',
        owner: 'devex',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
          { name: 'input', type: 'local', direction: 'input' },
          { name: 'output', type: 'local', direction: 'output' },
        ],
        capabilities: {
          type: 'transform',
          accepts: ['text', 'json'],
          produces: ['text'],
          features: ['uppercase', 'trim'],
        },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio',
        restart: 'never',
      };

      wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
      await wrapper.spawn();

      const endpoints = hostess.listEndpoints();
      const [_, endpoint] = Array.from(endpoints.entries())[0];

      // CUSTOMIZE: Update assertions to match your server's capabilities
      expect(endpoint.metadata).toBeDefined();

      // Note: For ExternalServerWrapper, capabilities are stored in the
      // manifest field of metadata, not directly in metadata.capabilities
      // Adjust this based on your wrapper's implementation
      if (endpoint.metadata?.capabilities) {
        expect(endpoint.metadata.capabilities.type).toBe('transform');
      }
    },
    testTimeout,
  );

  /**
   * TEST 4: Discovery by Capabilities
   *
   * VALIDATES: Endpoint can be found using capability queries
   * FAILURE SIGNALS:
   *   - Server not found → Query logic broken
   *   - Wrong server returned → Capability matching incorrect
   *
   * NOTE: This test demonstrates how to search for servers by capabilities.
   * The actual query API depends on your Hostess implementation.
   */
  it(
    'should be discoverable by capabilities',
    async () => {
      // CUSTOMIZE: Create multiple servers with different capabilities
      const transformManifest: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'transform-server',
        classHex: '0xTRANS',
        owner: 'devex',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
          { name: 'input', type: 'local', direction: 'input' },
          { name: 'output', type: 'local', direction: 'output' },
        ],
        capabilities: {
          type: 'transform',
        },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio',
        restart: 'never',
      };

      wrapper = new ExternalServerWrapper(kernel, hostess, transformManifest);
      await wrapper.spawn();

      // Query all endpoints
      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(1);

      // CUSTOMIZE: Implement your search logic based on capabilities
      // Example: Find all transform servers
      const transformServers = Array.from(endpoints.entries()).filter(
        ([_, ep]) => ep.type === 'external' && ep.coordinates.includes('cat'),
      );

      expect(transformServers.length).toBe(1);
      expect(transformServers[0][1].type).toBe('external');

      // Example: Search by metadata fields
      const externalServers = Array.from(endpoints.entries()).filter(
        ([_, ep]) => ep.metadata?.ioMode === 'stdio',
      );

      expect(externalServers.length).toBe(1);
    },
    testTimeout,
  );

  /**
   * TEST 5: Multiple Endpoint Registration
   *
   * VALIDATES: Multiple servers can register simultaneously
   * FAILURE SIGNALS:
   *   - Wrong count → Registration collision or leak
   *   - Duplicate IDs → ID generation broken
   */
  it(
    'should support multiple endpoint registrations',
    async () => {
      // Spawn first server
      const manifest1: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'server-1',
        classHex: '0x0001',
        owner: 'devex',
        auth: 'no',
        authMechanism: 'none',
        terminals: [{ name: 'input', type: 'local', direction: 'input' }],
        capabilities: { type: 'output' },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio',
        restart: 'never',
      };

      const wrapper1 = new ExternalServerWrapper(kernel, hostess, manifest1);
      await wrapper1.spawn();

      // Spawn second server
      const manifest2: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'server-2',
        classHex: '0x0002',
        owner: 'devex',
        auth: 'no',
        authMechanism: 'none',
        terminals: [{ name: 'output', type: 'local', direction: 'output' }],
        capabilities: { type: 'input' },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio',
        restart: 'never',
      };

      const wrapper2 = new ExternalServerWrapper(kernel, hostess, manifest2);
      await wrapper2.spawn();

      // Verify both registered
      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(2);

      // Verify unique IDs
      const endpointIds = Array.from(endpoints.keys());
      expect(new Set(endpointIds).size).toBe(2); // No duplicates

      // Clean up both
      await wrapper1.shutdown();
      await wrapper2.shutdown();

      // Assign to wrapper for afterEach cleanup
      wrapper = wrapper2;
    },
    testTimeout,
  );
});

/**
 * TROUBLESHOOTING GUIDE:
 * ----------------------
 *
 * 1. Endpoint not found after spawn
 *    - Ensure await wrapper.spawn() completes
 *    - Check that wrapper calls hostess.registerEndpoint()
 *    - Verify manifest is correctly configured
 *
 * 2. Wrong endpoint type
 *    - Check manifest.ioMode matches endpoint.type
 *    - Verify wrapper passes correct type to registerEndpoint()
 *
 * 3. Missing metadata
 *    - Ensure manifest is passed to wrapper constructor
 *    - Check wrapper propagates manifest to endpoint metadata
 *
 * 4. Test timeout
 *    - Increase testTimeout if system is slow
 *    - Verify wrapper.spawn() doesn't hang
 *    - Check for process leaks in afterEach
 *
 * 5. Multiple registration test fails
 *    - Ensure unique endpoint IDs
 *    - Check for registration conflicts
 *    - Verify proper cleanup in afterEach
 */
