import { Kernel } from '../kernel/Kernel.js';
import { StateManager } from '../state/StateManager.js';
import { TimerSource } from '../modules/timer.js';
import { ConsoleSink } from '../modules/consoleSink.js';
import { UppercaseTransform } from '../modules/uppercase.js';

const kernel = new Kernel();
const state = new StateManager(kernel);
state.subscribe((e) => console.log('[event]', e));

state.addNode({
  id: 'timer-1',
  name: 'Timer',
  terminals: [{ name: 'output', direction: 'output' }],
});
state.addNode({
  id: 'upper-1',
  name: 'Upper',
  terminals: [
    { name: 'input', direction: 'input' },
    { name: 'output', direction: 'output' },
  ],
});
state.addNode({ id: 'sink-1', name: 'Sink', terminals: [{ name: 'input', direction: 'input' }] });

const timer = new TimerSource(kernel, 200);
const upper = new UppercaseTransform(kernel);
const sink = new ConsoleSink('[rewire]');

state.connect('timer-1.output', 'upper-1.input');
state.connect('upper-1.output', 'sink-1.input');

timer.start();
setTimeout(() => {
  console.log('Rewiring: timer → sink directly');
  state.connect('timer-1.output', 'sink-1.input');
}, 1000);

setTimeout(() => {
  timer.stop();
  console.log('Done.');
}, 2500);
