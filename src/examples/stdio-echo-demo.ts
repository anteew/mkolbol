import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { Executor } from '../executor/Executor.js';
import type { ExternalServerManifest } from '../types.js';

async function main() {
  const kernel = new Kernel();
  const hostess = new Hostess();
  const stateManager = new StateManager(kernel);
  const executor = new Executor(kernel, hostess, stateManager);

  const echoManifest: ExternalServerManifest = {
    fqdn: 'localhost',
    servername: 'echo-stdio',
    classHex: '0xECHO',
    owner: 'demo',
    auth: 'no',
    authMechanism: 'none',
    terminals: [
      { name: 'input', type: 'local', direction: 'input' },
      { name: 'output', type: 'local', direction: 'output' },
      { name: 'error', type: 'local', direction: 'output' }
    ],
    capabilities: {
      type: 'transform',
      accepts: ['text'],
      produces: ['text'],
      features: ['passthrough']
    },
    command: '/bin/cat',
    args: [],
    env: {},
    cwd: process.cwd(),
    ioMode: 'stdio',
    restart: 'never'
  };

  console.log('[stdio-echo-demo] Starting echo demo with stdio mode...\n');
  
  const wrapper = await executor.spawnExternalWrapper(echoManifest);

  let outputReceived = '';

  wrapper.outputPipe.on('data', (data) => {
    const text = data.toString();
    outputReceived += text;
    process.stdout.write(`[OUTPUT] ${text}`);
  });

  wrapper.errorPipe.on('data', (data) => {
    process.stderr.write(`[ERROR] ${data.toString()}`);
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('[SEND] Hello from StdIO!\n');
  wrapper.inputPipe.write('Hello from StdIO!\n');

  await new Promise(resolve => setTimeout(resolve, 200));

  console.log('[SEND] Round-trip complete.\n');
  wrapper.inputPipe.write('Round-trip complete.\n');

  await new Promise(resolve => setTimeout(resolve, 200));

  await wrapper.shutdown();

  console.log('\n[stdio-echo-demo] Demo completed successfully!');
  console.log(`[SUMMARY] Sent 2 messages, received ${outputReceived.split('\n').filter(l => l).length} lines`);
  
  process.exit(0);
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
