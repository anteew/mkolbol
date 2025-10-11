import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { Executor } from '../executor/Executor.js';
import { readFileSync } from 'fs';
import { join } from 'path';
async function main() {
    const kernel = new Kernel();
    const hostess = new Hostess();
    const stateManager = new StateManager(kernel);
    const executor = new Executor(kernel, hostess, stateManager);
    const configPath = join(process.cwd(), 'examples/config/basic-topology.json');
    const configJson = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configJson);
    console.log('Loading topology config...');
    executor.load(config);
    console.log('Starting topology...');
    await executor.up();
    console.log('Topology running. Press Ctrl+C to stop.');
    setTimeout(async () => {
        console.log('\nShutting down...');
        await executor.down();
        console.log('Done.');
        process.exit(0);
    }, 3000);
}
main().catch(console.error);
//# sourceMappingURL=executor-demo.js.map