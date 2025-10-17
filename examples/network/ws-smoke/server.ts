import { WebSocketPipeServer } from '../../../src/pipes/adapters/WebSocketPipe.js';

async function main() {
  const server = new WebSocketPipeServer({ port: 30015 });

  console.log('Starting WebSocket server on port 30015...');

  await server.listen((stream) => {
    console.log('Client connected!');

    stream.on('data', (chunk) => {
      const message = chunk.toString('utf8');
      console.log(`[Server received]: ${message}`);

      // Echo back to client
      stream.write(`Server echo: ${message}`);
    });

    stream.on('end', () => {
      console.log('Client disconnected');
    });
  });

  console.log('WebSocket server listening. Press Ctrl+C to stop.');

  // Keep server running
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});
