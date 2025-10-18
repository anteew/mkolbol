import { Kernel } from '../../src/kernel/Kernel.js';
import { LoggingServer } from '../../src/servers/loggingServer.js';

async function main() {
  const kernel = new Kernel();
  const logger = new LoggingServer(kernel, { file: 'tmp/logs/demo.log.jsonl', level: 'debug', rotateBytes: 1024 * 1024 });

  const lines = [
    { level: 'info', message: 'hello world', fields: { a: 1 } },
    { level: 'debug', message: 'debug trace', fields: { detail: true } },
  ];

  for (const evt of lines) {
    logger.inputPipe.write(JSON.stringify(evt) + '\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

