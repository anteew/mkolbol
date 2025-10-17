import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { Executor } from '../executor/Executor.js';
async function main() {
    const kernel = new Kernel();
    const hostess = new Hostess();
    const stateManager = new StateManager(kernel);
    const executor = new Executor(kernel, hostess, stateManager);
    const catManifest = {
        fqdn: 'localhost',
        servername: 'cat-wrapper',
        classHex: '0xFFFF',
        owner: 'system',
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
            features: ['passthrough'],
        },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio',
        restart: 'on-failure',
        restartDelay: 1000,
        maxRestarts: 3,
    };
    console.log('Spawning cat wrapper...');
    const catWrapper = await executor.spawnExternalWrapper(catManifest);
    catWrapper.outputPipe.on('data', (data) => {
        console.log('Output:', data.toString());
    });
    catWrapper.errorPipe.on('data', (data) => {
        console.error('Error:', data.toString());
    });
    console.log('Sending data to cat...');
    catWrapper.inputPipe.write('Hello from external wrapper!\n');
    catWrapper.inputPipe.write('This is line 2\n');
    catWrapper.inputPipe.write('This is line 3\n');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('Querying Hostess for cat wrapper...');
    const servers = hostess.list().filter((s) => s.servername === 'cat-wrapper');
    console.log('Found servers:', servers.map((s) => s.servername));
    console.log('Shutting down...');
    await catWrapper.shutdown();
    console.log('Done!');
}
main().catch(console.error);
//# sourceMappingURL=external-wrapper-demo.js.map