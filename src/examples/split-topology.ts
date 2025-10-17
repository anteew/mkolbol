import { Kernel } from '../kernel/Kernel.js';
import { TimerSource } from '../modules/timer.js';
import { ConsoleSink } from '../modules/consoleSink.js';

const kernel = new Kernel();
const timer = new TimerSource(kernel, 400);
const sinkA = new ConsoleSink('[A]');
const sinkB = new ConsoleSink('[B]');

kernel.split(timer.outputPipe, [sinkA.inputPipe, sinkB.inputPipe]);

timer.start();
setTimeout(() => {
  timer.stop();
  console.log('Done.');
}, 2000);
