import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { Executor } from '../executor/Executor.js';
import { TimerSource } from '../modules/timer.js';
import { UppercaseTransform } from '../modules/uppercase.js';
import { ConsoleSink } from '../modules/consoleSink.js';
import type { TopologyConfig } from '../config/schema.js';

async function main() {
  console.log('='.repeat(60));
  console.log('[worker-demo] Mixed-Mode Topology Demo');
  console.log('[worker-demo] Demonstrates inproc + worker execution');
  console.log('='.repeat(60));

  const kernel = new Kernel();
  const hostess = new Hostess();
  const stateManager = new StateManager(kernel);
  const executor = new Executor(kernel, hostess, stateManager);

  console.log('[worker-demo] Registering modules...');
  executor.registerModule('TimerSource', TimerSource);
  executor.registerModule('UppercaseTransform', UppercaseTransform);
  executor.registerModule('ConsoleSink', ConsoleSink);

  const config: TopologyConfig = {
    nodes: [
      { id: 'timer-1', module: 'TimerSource', params: { periodMs: 600 }, runMode: 'inproc' },
      { id: 'upper-1', module: 'UppercaseTransform', runMode: 'worker' },
      { id: 'upper-2', module: 'UppercaseTransform', runMode: 'inproc' },
      {
        id: 'sink-1',
        module: 'ConsoleSink',
        params: { prefix: '[WORKER-PATH]' },
        runMode: 'inproc',
      },
      {
        id: 'sink-2',
        module: 'ConsoleSink',
        params: { prefix: '[INPROC-PATH]' },
        runMode: 'worker',
      },
    ],
    connections: [
      { from: 'timer-1.output', to: 'upper-1.input' },
      { from: 'timer-1.output', to: 'upper-2.input' },
      { from: 'upper-1.output', to: 'sink-1.input' },
      { from: 'upper-2.output', to: 'sink-2.input' },
    ],
  };

  console.log('[worker-demo] Loading topology with 5 nodes:');
  console.log('  - timer-1:  [INPROC] TimerSource');
  console.log('  - upper-1:  [WORKER] UppercaseTransform');
  console.log('  - upper-2:  [INPROC] UppercaseTransform');
  console.log('  - sink-1:   [INPROC] ConsoleSink');
  console.log('  - sink-2:   [WORKER] ConsoleSink');
  console.log();
  console.log('[worker-demo] Data flow paths:');
  console.log('  - timer-1 → upper-1(worker) → sink-1(inproc)');
  console.log('  - timer-1 → upper-2(inproc) → sink-2(worker)');
  console.log();

  executor.load(config);

  console.log('[worker-demo] Starting topology...');
  await executor.up();

  console.log('[worker-demo] Topology UP. Data flowing across boundaries...');
  console.log('[worker-demo] Watch for messages from both paths:\n');

  await new Promise((resolve) => setTimeout(resolve, 500));

  setTimeout(async () => {
    console.log('\n' + '='.repeat(60));
    console.log('[worker-demo] Shutting down topology...');
    await executor.down();
    console.log('[worker-demo] Shutdown complete.');
    console.log('='.repeat(60));
    process.exit(0);
  }, 5000);
}

main().catch((err) => {
  console.error('[worker-demo] Fatal error:', err);
  process.exit(1);
});
