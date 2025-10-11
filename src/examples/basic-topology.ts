import { Kernel } from '../kernel/Kernel.js';
import { TimerSource } from '../modules/timer.js';
import { UppercaseTransform } from '../modules/uppercase.js';
import { ConsoleSink } from '../modules/consoleSink.js';

const kernel = new Kernel();

const timer = new TimerSource(kernel, 300);
const upper = new UppercaseTransform(kernel);
const sink = new ConsoleSink('[basic]');

kernel.connect(timer.outputPipe, upper.inputPipe);
kernel.connect(upper.outputPipe, sink.inputPipe);

timer.start();

setTimeout(() => {
  timer.stop();
  console.log('Done.');
}, 2500);
