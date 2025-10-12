import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { PTYServerWrapper } from '../../src/wrappers/PTYServerWrapper.js';
import { PassthroughRenderer } from '../../src/renderers/PassthroughRenderer.js';
import { LoggerRenderer } from '../../src/renderers/LoggerRenderer.js';
import type { ExternalServerManifest } from '../../src/types.js';
import * as fs from 'fs';

/**
 * PTY Test Group: Integration Tests
 * 
 * These tests use PTY (pseudoterminal) and require single-fork execution.
 * Run via: npm run test:pty
 * 
 * Rationale: Tests PTY output splitting across multiple renderers, which
 * requires an actual PTY session with real process interaction.
 */
describe('Multi-Modal Output Integration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: PTYServerWrapper;
  let passthrough: PassthroughRenderer;
  let logger: LoggerRenderer;
  const testLogPath = '/tmp/mkolbol-integration-test.log';

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
    
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  afterEach(async () => {
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
    if (passthrough) {
      passthrough.destroy();
    }
    if (logger) {
      logger.destroy();
    }
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  it('should split PTY output to 2+ renderers', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-multi',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/bash',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty'
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    passthrough = new PassthroughRenderer(kernel);
    logger = new LoggerRenderer(kernel, testLogPath);

    kernel.split(wrapper.outputPipe, [
      passthrough.inputPipe,
      logger.inputPipe
    ]);

    await wrapper.spawn();

    wrapper.inputPipe.write('echo "multi-modal test"\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const logContent = fs.readFileSync(testLogPath, 'utf8');
    expect(logContent).toContain('multi-modal test');
  });
});
