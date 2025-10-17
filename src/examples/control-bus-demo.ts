import { Kernel } from '../kernel/Kernel.js';
import { StateManager } from '../state/StateManager.js';
import { ControlBus } from '../control/ControlBus.js';
import { TopologyController } from '../controller/TopologyController.js';

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  const kernel = new Kernel();
  const state = new StateManager(kernel);
  const bus = new ControlBus();
  const controller = new TopologyController(kernel, state, bus, {
    commandsTopic: 'topology.commands',
    eventsTopic: 'topology.events',
  });
  controller.start();

  // HMI subscribe to events
  bus.subscribe('topology.events', (e) => {
    if (e.kind === 'event') {
      console.log('[event]', e.type, e.payload ?? '');
    } else if (e.kind === 'ack') {
      console.log('[ack]', e.correlationId);
    } else if (e.kind === 'err') {
      console.error('[err]', e.payload?.message);
    }
  });

  const cmd = (type: string, payload?: any) =>
    bus.publish('topology.commands', {
      kind: 'cmd',
      type,
      id: Math.random().toString(16).slice(2),
      ts: Date.now(),
      payload,
    });

  // Declare three nodes with terminals
  cmd('declare-node', {
    id: 'timer-1',
    name: 'Timer',
    terminals: [{ name: 'output', direction: 'output' }],
  });
  cmd('declare-node', {
    id: 'upper-1',
    name: 'Upper',
    terminals: [
      { name: 'input', direction: 'input' },
      { name: 'output', direction: 'output' },
    ],
  });
  cmd('declare-node', {
    id: 'sink-1',
    name: 'Sink',
    terminals: [{ name: 'input', direction: 'input' }],
  });

  // Wire: timer.output -> upper.input -> sink.input
  await sleep(10);
  cmd('connect', { from: 'timer-1.output', to: 'upper-1.input' });
  cmd('connect', { from: 'upper-1.output', to: 'sink-1.input' });

  // Snapshot
  await sleep(10);
  cmd('snapshot');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
