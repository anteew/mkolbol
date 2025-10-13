import { Hostess } from '../hostess/Hostess.js';
import { buildServerManifest, startHeartbeat } from '../hostess/client.js';
async function main() {
    const hostess = new Hostess({ heartbeatIntervalMs: 5000, evictionThresholdMs: 20000 });
    hostess.startEvictionLoop();
    const ptyManifest = buildServerManifest({
        fqdn: 'localhost',
        servername: 'pty-server',
        classHex: '0x0001',
        owner: 'system',
        terminals: [
            { name: 'tty', type: 'local', direction: 'multiplexer' }
        ],
        capabilities: { type: 'source', accepts: ['terminal-input'], produces: ['raw-ansi'], features: ['vt100'] }
    });
    const rendererManifest = buildServerManifest({
        fqdn: 'localhost',
        servername: 'renderer',
        classHex: '0x0002',
        owner: 'system',
        terminals: [
            { name: 'display', type: 'local', direction: 'input' }
        ],
        capabilities: { type: 'output', accepts: ['terminal-state'], produces: [], features: ['xterm-js'] }
    });
    const ptyId = hostess.register(ptyManifest);
    const rendId = hostess.register(rendererManifest);
    const stopPtyHeartbeat = startHeartbeat(hostess, ptyId, 5000);
    const stopRendHeartbeat = startHeartbeat(hostess, rendId, 5000);
    console.log('Registered services:', hostess.list().map(e => e.identity));
    const outputs = hostess.query({ type: 'output', accepts: 'terminal-state', availableOnly: true });
    console.log('Available output modules:', outputs.map(e => `${e.servername}:${e.classHex}`));
    hostess.markInUse(rendId, 'display', 'connectome-1');
    const outputsAfterUse = hostess.query({ type: 'output', accepts: 'terminal-state', availableOnly: true });
    console.log('After markInUse, available outputs:', outputsAfterUse.map(e => e.servername));
    hostess.markAvailable(rendId, 'display');
    const outputsAfterFree = hostess.query({ type: 'output', accepts: 'terminal-state', availableOnly: true });
    console.log('After markAvailable, available outputs:', outputsAfterFree.map(e => e.servername));
    stopPtyHeartbeat();
    console.log('Stopped PTY heartbeat; waiting for eviction...');
    setTimeout(() => {
        const avail = hostess.query({ availableOnly: true }).map(e => e.servername);
        console.log('Available after eviction window:', avail);
        stopRendHeartbeat();
        hostess.stopEvictionLoop();
    }, 21000);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=hostess-demo.js.map