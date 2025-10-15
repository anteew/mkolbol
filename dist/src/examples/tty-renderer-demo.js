import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { PTYServerWrapper } from '../wrappers/PTYServerWrapper.js';
import { XtermTTYRenderer } from '../modules/xterm-tty-renderer.js';
async function main() {
    const kernel = new Kernel();
    const hostess = new Hostess();
    const state = new StateManager(kernel);
    // Renderer: write raw ANSI to this terminal (alternate buffer for a clean view)
    const renderer = new XtermTTYRenderer({ altBuffer: true });
    renderer.start();
    // Spawn a bash PTY and pipe its output into the renderer
    const manifest = {
        fqdn: 'localhost',
        servername: 'bash-demo',
        classHex: '0xFFFF',
        owner: 'demo',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
            { name: 'input', type: 'local', direction: 'input' },
            { name: 'output', type: 'local', direction: 'output' }
        ],
        capabilities: { type: 'transform' },
        command: '/bin/bash',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'pty',
        initialCols: process.stdout.columns ?? 80,
        initialRows: process.stdout.rows ?? 24,
    };
    const pty = new PTYServerWrapper(kernel, hostess, manifest);
    await pty.spawn();
    // Wire PTY → Renderer
    pty.outputPipe.pipe(renderer.inputPipe);
    // Send a simple command and then exit
    pty.inputPipe.write('echo "xterm TTY renderer demo"\n');
    setTimeout(() => pty.inputPipe.write('exit\n'), 500);
    // Teardown after a short delay (simple demo)
    setTimeout(async () => {
        await pty.shutdown();
        renderer.stop();
        process.exit(0);
    }, 1200);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=tty-renderer-demo.js.map