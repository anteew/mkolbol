import { Kernel } from '../kernel/Kernel.js';
import { TimerSource } from '../modules/timer.js';
import { ConsoleSink } from '../modules/consoleSink.js';

const kernel = new Kernel();
const fast = new TimerSource(kernel, 200);
const slow = new TimerSource(kernel, 500);
const sink = new ConsoleSink('[merge]');

const merged = kernel.createPipe({ objectMode: true });
kernel.merge([fast.outputPipe, slow.outputPipe], merged);
kernel.connect(merged, sink.inputPipe);

fast.start(); slow.start();
setTimeout(() => { fast.stop(); slow.stop(); console.log('Done.'); }, 2000);
