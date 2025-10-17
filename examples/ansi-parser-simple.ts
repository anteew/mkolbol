import { Kernel } from '../src/kernel/Kernel.js';
import { AnsiParserModule } from '../src/modules/ansi-parser-module.js';
import { Writable } from 'stream';

const kernel = new Kernel();
const parser = new AnsiParserModule(kernel);

const output = new Writable({
  objectMode: true,
  write: (events, _enc, cb) => {
    console.log('Parsed Events:', JSON.stringify(events, null, 2));
    cb();
  },
});

kernel.connect(parser.outputPipe, output as any);

console.log('=== ANSI Parser Example ===\n');
console.log('Parsing ANSI escape sequences...\n');

parser.inputPipe.write('\x1b[1;32mGreen Bold Text\x1b[0m\n');
parser.inputPipe.write('Normal text\n');
parser.inputPipe.write('\x1b[4mUnderlined\x1b[0m\n');

setTimeout(() => {
  console.log('\n=== Parser State ===');
  console.log(parser.getState());
}, 100);
