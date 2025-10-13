import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { PTYServerWrapper } from '../wrappers/PTYServerWrapper.js';
import { PassthroughRenderer } from '../renderers/PassthroughRenderer.js';
import { LoggerRenderer } from '../renderers/LoggerRenderer.js';
async function main() {
    console.log('=== Multi-Modal Output Example ===\n');
    const kernel = new Kernel();
    const hostess = new Hostess();
    const bashManifest = {
        fqdn: 'localhost',
        servername: 'bash-multimodal',
        classHex: '0xFFFF',
        owner: 'system',
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
    const bashPTY = new PTYServerWrapper(kernel, hostess, bashManifest);
    const passthrough = new PassthroughRenderer(kernel);
    const logger = new LoggerRenderer(kernel, '/tmp/mkolbol-session.log');
    console.log('Splitting PTY output to: [passthrough, logger]');
    kernel.split(bashPTY.outputPipe, [
        passthrough.inputPipe,
        logger.inputPipe
    ]);
    console.log('Starting bash PTY...\n');
    await bashPTY.spawn();
    bashPTY.inputPipe.write('echo "This goes to screen AND log file"\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    bashPTY.inputPipe.write('date\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('\n\nSession logged to: /tmp/mkolbol-session.log');
    console.log('Shutting down...');
    await bashPTY.shutdown();
    passthrough.destroy();
    logger.destroy();
}
main().catch(console.error);
//# sourceMappingURL=multi-modal-output.js.map