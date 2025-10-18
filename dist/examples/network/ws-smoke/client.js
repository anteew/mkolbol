import { WebSocketPipeClient } from '../../../src/pipes/adapters/WebSocketPipe.js';
async function main() {
    const client = new WebSocketPipeClient({ port: 30015 });
    console.log('Connecting to WebSocket server on port 30015...');
    try {
        await client.connect();
        console.log('Connected!');
        client.on('data', (chunk) => {
            const message = chunk.toString('utf8');
            console.log(`[Client received]: ${message}`);
        });
        // Send some messages
        client.write('Hello from client!');
        client.write('This is a test message');
        client.write('WebSocket streaming works!');
        // Wait a bit for responses
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Closing connection...');
        client.end();
    }
    catch (err) {
        console.error('Client error:', err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=client.js.map