import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { PTYServerWrapper } from '../wrappers/PTYServerWrapper.js';
import { TTYRenderer } from '../modules/ttyRenderer.js';

async function main() {
  if (!process.stdin.isTTY) {
    console.log('❌ No TTY available. Run this in an interactive terminal.');
    process.exit(1);
  }

  const kernel = new Kernel();
  const hostess = new Hostess();

  const bash = new PTYServerWrapper(kernel, hostess, {
    fqdn: 'localhost',
    servername: 'bash-pty',
    classHex: '0x0000',
    owner: 'demo',
    auth: 'no',
    authMechanism: 'none',
    terminals: [
      { name: 'input', type: 'local', direction: 'input' },
      { name: 'output', type: 'local', direction: 'output' },
      { name: 'error', type: 'local', direction: 'output' }
    ],
    capabilities: { type: 'source', accepts: [], produces: [] },
    command: 'bash',
    args: ['-l'],
    // inherit default env via ExternalServerWrapper; explicit env not required here
    cwd: process.cwd(),
    ioMode: 'pty',
    restart: 'never'
  });

  const tty = new TTYRenderer(kernel, { target: 'stdout' });

  // Wire PTY → TTY
  kernel.connect(bash.outputPipe, tty.inputPipe);

  // Start PTY
  await bash.spawn();
  bash.inputPipe.write('echo "[mkolbol] bash host ready — type commands (Ctrl+D to exit)"\n');

  // Forward user keystrokes to PTY (raw mode)
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.on('data', (buf) => {
    // Ctrl+D ends
    if (buf.length === 1 && buf[0] === 0x04) {
      process.stdin.setRawMode?.(false);
      bash.shutdown().then(() => process.exit(0));
      return;
    }
    bash.inputPipe.write(buf);
  });

  const onSignal = async () => {
    process.stdin.setRawMode?.(false);
    await bash.shutdown();
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}

main().catch((err) => {
  console.error('[bash-shell-host] Error:', err);
  process.exit(1);
});
