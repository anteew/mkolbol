import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { PTYServerWrapper } from '../wrappers/PTYServerWrapper.js';
async function main() {
    const kernel = new Kernel();
    const hostess = new Hostess();
    const stateManager = new StateManager(kernel);
    const bashManifest = {
        fqdn: 'localhost',
        servername: 'bash-session',
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
    console.log('Spawning bash PTY wrapper...');
    const bashPTY = new PTYServerWrapper(kernel, hostess, bashManifest);
    await bashPTY.spawn();
    bashPTY.outputPipe.on('data', (data) => {
        process.stdout.write(data.toString());
    });
    console.log('\nSending commands to bash...');
    bashPTY.inputPipe.write('echo "Hello from PTY wrapper!"\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    bashPTY.inputPipe.write('pwd\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    bashPTY.inputPipe.write('ls -la | head -5\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('\nTesting resize...');
    bashPTY.resize(100, 30);
    console.log('Resized to 100x30');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('\nQuerying Hostess for bash wrapper...');
    const servers = hostess.list().filter(s => s.servername === 'bash-session');
    console.log('Found servers:', servers.map(s => s.servername));
    const processInfo = bashPTY.getProcessInfo();
    console.log('Process info:', {
        pid: processInfo.pid,
        uptime: `${processInfo.uptime}ms`,
        memory: `${Math.round(processInfo.memoryUsage / 1024 / 1024)}MB`
    });
    console.log('\nShutting down...');
    await bashPTY.shutdown();
    console.log('Done!');
}
main().catch(console.error);
//# sourceMappingURL=pty-wrapper-demo.js.map