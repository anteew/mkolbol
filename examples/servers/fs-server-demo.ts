import { Kernel } from '../../src/kernel/Kernel.js';
import { FilesystemServer } from '../../src/servers/filesystemServer.js';

async function main() {
  const kernel = new Kernel();
  const fsServer = new FilesystemServer(kernel, process.cwd());

  // Simple demo: write a file, stat it, read it back
  const reqs = [
    { id: '1', op: 'mkdirp', path: 'tmp/demo' },
    { id: '2', op: 'writeFile', path: 'tmp/demo/hello.txt', dataBase64: Buffer.from('hello world').toString('base64') },
    { id: '3', op: 'stat', path: 'tmp/demo/hello.txt' },
    { id: '4', op: 'readFile', path: 'tmp/demo/hello.txt' },
  ];

  fsServer.outputPipe.on('data', (chunk) => process.stdout.write(chunk));
  for (const r of reqs) {
    fsServer.inputPipe.write(JSON.stringify(r) + '\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

