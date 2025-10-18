#!/usr/bin/env tsx
import { Kernel } from '../../../src/kernel/Kernel.js';
import { TimerSource } from '../../../src/modules/timer.js';
import { TCPPipeServer } from '../../../src/pipes/adapters/TCPPipe.js';
const kernel = new Kernel();
const timer = new TimerSource(kernel, 1000, 'Server message');
const tcpServer = new TCPPipeServer({ port: 30018 });
console.log('[Server] Starting timer source...');
timer.start();
console.log('[Server] Listening on TCP port 30018...');
tcpServer.listen((clientStream) => {
    console.log('[Server] Client connected, streaming data...');
    timer.outputPipe.pipe(clientStream);
    clientStream.on('end', () => {
        console.log('[Server] Client disconnected');
    });
});
process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...');
    timer.stop();
    await tcpServer.close();
    process.exit(0);
});
console.log('[Server] Press Ctrl+C to stop');
//# sourceMappingURL=server.js.map