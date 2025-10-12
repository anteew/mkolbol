import { Kernel } from '../kernel/Kernel.js';
import { TimerSource } from '../modules/timer.js';
import { UppercaseTransform } from '../modules/uppercase.js';
import { ConsoleSink } from '../modules/consoleSink.js';

console.log('=== Debug Demo ===\n');

console.log('Environment:');
console.log(`  DEBUG=${process.env.DEBUG || '(not set)'}`);
console.log(`  MK_DEBUG_MODULES=${process.env.MK_DEBUG_MODULES || '(not set)'}`);
console.log(`  MK_DEBUG_LEVEL=${process.env.MK_DEBUG_LEVEL || '(not set)'}\n`);

console.log('Creating kernel and modules...\n');

const kernel = new Kernel();
const timer = new TimerSource(kernel, 300);
const upper = new UppercaseTransform(kernel);
const sink = new ConsoleSink('[debug-demo]');

kernel.connect(timer.outputPipe, upper.inputPipe);
kernel.connect(upper.outputPipe, sink.inputPipe);

timer.start();

setTimeout(() => {
  timer.stop();
  console.log('\nDone.');
  console.log('\nNote: When DEBUG=1, debug events appear in console above.');
  console.log('In test mode (LAMINAR_DEBUG=1), events are written to reports/ as JSONL.');
}, 2500);
