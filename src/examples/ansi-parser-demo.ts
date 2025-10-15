import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { PTYServerWrapper } from '../wrappers/PTYServerWrapper.js';
import { AnsiParserModule } from '../modules/ansi-parser-module.js';
import { ConsoleSink } from '../modules/consoleSink.js';
import type { ExternalServerManifest } from '../types.js';
import { Writable } from 'stream';

class JSONSink {
  public readonly inputPipe: any;

  constructor(private prefix = '[json]') {
    const sink = new Writable({
      objectMode: true,
      write: (chunk, _enc, cb) => {
        console.log(`${prefix}`, JSON.stringify(chunk, null, 2));
        cb();
      }
    });
    this.inputPipe = sink;
  }
}

async function main() {
  const kernel = new Kernel();
  const hostess = new Hostess();
  const stateManager = new StateManager(kernel);

  const bashManifest: ExternalServerManifest = {
    fqdn: 'localhost',
    servername: 'bash-demo',
    classHex: '0xFFFF',
    owner: 'system',
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
      features: ['interactive', 'pty']
    },
    shell: '/bin/bash',
    shellArgs: [],
    command: '/bin/bash',
    args: [],
    env: {},
    cwd: process.cwd(),
    ioMode: 'pty',
    terminalType: 'xterm-256color',
    initialCols: 80,
    initialRows: 24,
    restart: 'on-failure',
    restartDelay: 1000,
    maxRestarts: 3
  };

  console.log('=== ANSI Parser Demo: PTY → AnsiParser → [ConsoleSink + JSONSink] ===\n');

  console.log('Spawning PTY wrapper...');
  const pty = new PTYServerWrapper(kernel, hostess, bashManifest);
  await pty.spawn();

  const ansiParser = new AnsiParserModule(kernel);
  const consoleSink = new ConsoleSink('[console]');
  const jsonSink = new JSONSink('[parsed]');

  console.log('Connecting topology: PTY → AnsiParser → [Console + JSON]\n');
  kernel.connect(pty.outputPipe, ansiParser.inputPipe);
  kernel.split(ansiParser.outputPipe, [consoleSink.inputPipe, jsonSink.inputPipe]);

  console.log('Sending test commands...\n');

  pty.inputPipe.write('echo "\\x1b[1;32mGreen Bold Text\\x1b[0m"\n');
  await new Promise(resolve => setTimeout(resolve, 300));

  pty.inputPipe.write('echo "Normal text"\n');
  await new Promise(resolve => setTimeout(resolve, 300));

  pty.inputPipe.write('pwd\n');
  await new Promise(resolve => setTimeout(resolve, 300));

  console.log('\n=== Parser State ===');
  console.log(ansiParser.getState());

  console.log('\nShutting down...');
  await pty.shutdown();
  
  console.log('Done!');
}

main().catch(console.error);
