import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { PTYServerWrapper } from '../../src/wrappers/PTYServerWrapper.js';
import type { ExternalServerManifest } from '../../src/types.js';

describe('PTYServerWrapper', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: PTYServerWrapper;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
  });

  afterEach(async () => {
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
  });

  it('should spawn PTY process', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-pty',
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
      command: '/bin/bash',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty',
      terminalType: 'xterm-256color',
      initialCols: 80,
      initialRows: 24
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    expect(wrapper.isRunning()).toBe(true);
    expect(wrapper.getProcessInfo().pid).toBeGreaterThan(0);
  });

  it('should pipe data bidirectionally', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-pty-io',
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
    await wrapper.spawn();

    const output: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => output.push(Buffer.from(data)));

    wrapper.inputPipe.write('echo "test data"\n');
    
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = Buffer.concat(output).toString();
    expect(result).toContain('test data');
  });

  it('should handle resize', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-resize',
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
      ioMode: 'pty',
      initialCols: 80,
      initialRows: 24
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    expect(() => wrapper.resize(100, 30)).not.toThrow();
    expect(wrapper['terminalSize'].cols).toBe(100);
    expect(wrapper['terminalSize'].rows).toBe(30);
  });

  it('should send signals', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-signal',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [],
      capabilities: {
        type: 'source'
      },
      command: '/bin/bash',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty'
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    expect(wrapper.isRunning()).toBe(true);
    
    wrapper.sendSignal('SIGTERM');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(wrapper.isRunning()).toBe(false);
  });

  it('should handle process exit', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-exit',
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
      args: ['-c', 'exit 0'],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty'
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(wrapper.isRunning()).toBe(false);
  });

  it('should register PTY server with Hostess', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-hostess',
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
      command: '/bin/bash',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty'
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const servers = hostess.list();
    const found = servers.find(s => s.servername === 'bash-hostess');
    
    expect(found).toBeDefined();
    expect(found?.servername).toBe('bash-hostess');
  });

  it('should work with basic shell (bash)', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'interactive-bash',
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
      shell: '/bin/bash',
      shellArgs: [],
      command: '/bin/bash',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty'
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const output: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => output.push(Buffer.from(data)));

    wrapper.inputPipe.write('pwd\n');
    
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = Buffer.concat(output).toString();
    expect(result).toContain(process.cwd());
  });

  it('should handle interactive commands', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'interactive-commands',
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
    await wrapper.spawn();

    const output: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => output.push(Buffer.from(data)));

    wrapper.inputPipe.write('echo "line1"\n');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    wrapper.inputPipe.write('echo "line2"\n');
    await new Promise(resolve => setTimeout(resolve, 200));

    const result = Buffer.concat(output).toString();
    expect(result).toContain('line1');
    expect(result).toContain('line2');
  });
});
