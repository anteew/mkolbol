import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { ExternalServerWrapper } from '../../src/wrappers/ExternalServerWrapper.js';
import type { ExternalServerManifest } from '../../src/types.js';

describe('ExternalServerWrapper', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: ExternalServerWrapper;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
  });

  afterEach(async () => {
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
  });

  it('should spawn a simple process', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'echo-test',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform',
        accepts: ['text'],
        produces: ['text']
      },
      command: '/bin/echo',
      args: ['hello world'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    expect(wrapper.isRunning()).toBe(true);
    expect(wrapper.getProcessInfo().pid).toBeGreaterThan(0);
  });

  it('should pipe data bidirectionally', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'cat-test',
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
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const output: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => output.push(data));

    wrapper.inputPipe.write('test data\n');
    
    await new Promise(resolve => setTimeout(resolve, 100));

    const result = Buffer.concat(output).toString();
    expect(result).toContain('test data');
  });

  it('should handle environment variables', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'env-test',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'source'
      },
      command: '/bin/sh',
      args: ['-c', 'echo $TEST_VAR'],
      env: { TEST_VAR: 'hello' },
      cwd: process.cwd(),
      ioMode: 'stdio'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    
    const output: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => output.push(data));

    await wrapper.spawn();
    
    await new Promise(resolve => setTimeout(resolve, 200));

    const result = Buffer.concat(output).toString();
    expect(result.trim()).toBe('hello');
  });

  it('should register with Hostess on spawn', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'hostess-test',
      classHex: '0xFFFF',
      owner: 'test',
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
      ioMode: 'stdio'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const servers = hostess.list();
    const found = servers.find(s => s.servername === 'hostess-test');
    
    expect(found).toBeDefined();
    expect(found?.servername).toBe('hostess-test');
  });

  it('should gracefully shutdown with SIGTERM', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'shutdown-test',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [],
      capabilities: {
        type: 'source'
      },
      command: '/bin/sleep',
      args: ['10'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    expect(wrapper.isRunning()).toBe(true);

    await wrapper.shutdown(1000);

    expect(wrapper.isRunning()).toBe(false);
  });

  it('should restart on failure with "on-failure" policy', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'restart-test',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [],
      capabilities: {
        type: 'source'
      },
      command: '/bin/sh',
      args: ['-c', 'exit 1'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'on-failure',
      restartDelay: 100,
      maxRestarts: 2
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    await new Promise(resolve => setTimeout(resolve, 500));

    expect(wrapper['restartCount']).toBeGreaterThan(0);
  }, 10000);

  it('should not restart with "never" policy', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'no-restart-test',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [],
      capabilities: {
        type: 'source'
      },
      command: '/bin/sh',
      args: ['-c', 'exit 1'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never',
      restartDelay: 100,
      maxRestarts: 3
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(wrapper['restartCount']).toBe(0);
    expect(wrapper.isRunning()).toBe(false);
  });

  it('should respect maxRestarts limit', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'max-restart-test',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [],
      capabilities: {
        type: 'source'
      },
      command: '/bin/sh',
      args: ['-c', 'exit 1'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'always',
      restartDelay: 50,
      maxRestarts: 2
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    await new Promise(resolve => setTimeout(resolve, 500));

    expect(wrapper['restartCount']).toBe(2);
  }, 10000);

  it('should provide process info', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'info-test',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [],
      capabilities: {
        type: 'source'
      },
      command: '/bin/sleep',
      args: ['5'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const info = wrapper.getProcessInfo();
    
    expect(info.pid).toBeGreaterThan(0);
    expect(info.uptime).toBeGreaterThanOrEqual(0);
    expect(info.memoryUsage).toBeGreaterThanOrEqual(0);
  });
});
