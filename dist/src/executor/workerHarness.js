import { workerData, parentPort } from 'node:worker_threads';
import { Kernel } from '../kernel/Kernel.js';
import { WorkerPipe } from '../pipes/adapters/WorkerPipe.js';
import { WorkerBusAdapter } from '../control/adapters/WorkerBusAdapter.js';
import { ControlBus } from '../control/ControlBus.js';
async function bootWorker() {
    const config = workerData;
    if (!parentPort) {
        throw new Error('workerHarness must run inside a Worker');
    }
    const kernel = new Kernel();
    const controlBus = new ControlBus(new WorkerBusAdapter(config.controlPort));
    const ModuleConstructor = await import(config.modulePath).then((m) => m[Object.keys(m)[0]]);
    const moduleParams = Object.values(config.params || {});
    const moduleInstance = new ModuleConstructor(kernel, ...moduleParams);
    if (config.inputPort && moduleInstance.inputPipe) {
        const workerInput = new WorkerPipe(config.inputPort).createDuplex({ objectMode: true });
        workerInput.pipe(moduleInstance.inputPipe);
    }
    if (config.outputPort && moduleInstance.outputPipe) {
        const workerOutput = new WorkerPipe(config.outputPort).createDuplex({ objectMode: true });
        moduleInstance.outputPipe.pipe(workerOutput);
    }
    if (typeof moduleInstance.start === 'function') {
        moduleInstance.start();
    }
    controlBus.publish('control.hello', {
        kind: 'event',
        type: 'worker.ready',
        id: config.nodeId,
        ts: Date.now(),
        payload: { nodeId: config.nodeId },
    });
    parentPort.on('message', (msg) => {
        if (msg && msg.type === 'shutdown') {
            if (typeof moduleInstance.stop === 'function') {
                moduleInstance.stop();
            }
            process.exit(0);
        }
    });
}
bootWorker().catch((err) => {
    console.error('[workerHarness] Boot failed:', err);
    process.exit(1);
});
//# sourceMappingURL=workerHarness.js.map