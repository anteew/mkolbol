import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { PTYServerWrapper } from '../wrappers/PTYServerWrapper.js';
import { KeyboardInput } from '../modules/keyboard-input.js';
import type { ExternalServerManifest } from '../types.js';

async function main() {
  if (!process.stdin.isTTY) {
    console.log('[keyboard-pty-tty] No TTY available. This demo requires an interactive terminal.');
    console.log('[keyboard-pty-tty] Please run this demo in a terminal with TTY support.');
    process.exit(0);
  }

  console.log('[keyboard-pty-tty] Starting Keyboard → PTY → TTY demo...');
  console.log('[keyboard-pty-tty] Press keys to see them echoed. Press Ctrl+C to exit.\n');

  const kernel = new Kernel();
  const hostess = new Hostess();
  const stateManager = new StateManager(kernel);

  const catManifest: ExternalServerManifest = {
    fqdn: 'localhost',
    servername: 'cat-pty',
    classHex: '0xCAT1',
    owner: 'demo',
    auth: 'no',
    authMechanism: 'none',
    terminals: [
      { name: 'input', type: 'local', direction: 'input' },
      { name: 'output', type: 'local', direction: 'output' },
      { name: 'error', type: 'local', direction: 'output' },
    ],
    capabilities: {
      type: 'transform',
      accepts: ['text'],
      produces: ['text'],
      features: ['interactive', 'pty'],
    },
    command: '/bin/cat',
    args: [],
    env: {},
    cwd: process.cwd(),
    ioMode: 'pty',
    terminalType: 'xterm-256color',
    initialCols: 80,
    initialRows: 24,
    restart: 'never',
  };

  const catPTY = new PTYServerWrapper(kernel, hostess, catManifest);
  await catPTY.spawn();

  catPTY.outputPipe.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  catPTY.errorPipe.on('data', (data) => {
    process.stderr.write(`[ERROR] ${data.toString()}`);
  });

  const keyboard = new KeyboardInput();

  keyboard.on('error', (err) => {
    console.error('[keyboard-pty-tty] Keyboard error:', err);
    cleanup();
  });

  keyboard.on('keypress', (event) => {
    catPTY.inputPipe.write(event.sequence);
  });

  keyboard.on('ctrl-c', async () => {
    console.log('\n[keyboard-pty-tty] Received Ctrl+C, shutting down...');
    await cleanup();
  });

  async function cleanup() {
    keyboard.stop();
    await catPTY.shutdown();
    process.exit(0);
  }

  keyboard.start();

  process.on('SIGINT', async () => {
    console.log('\n[keyboard-pty-tty] Received SIGINT, shutting down...');
    await cleanup();
  });

  process.on('SIGTERM', async () => {
    console.log('\n[keyboard-pty-tty] Received SIGTERM, shutting down...');
    await cleanup();
  });
}

main().catch((err) => {
  console.error('[keyboard-pty-tty] Error:', err);
  process.exit(1);
});
