import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { Executor } from '../executor/Executor.js';
import { loadConfig } from '../config/loader.js';
async function main() {
    const args = process.argv.slice(2);
    const fileIndex = args.indexOf('--file');
    if (fileIndex === -1 || fileIndex === args.length - 1) {
        console.error('Usage: node config-runner.js --file <path-to-yaml>');
        process.exit(1);
    }
    const configPath = args[fileIndex + 1];
    console.log(`Loading config from: ${configPath}`);
    const config = loadConfig(configPath);
    const kernel = new Kernel();
    const hostess = new Hostess();
    const stateManager = new StateManager(kernel);
    const executor = new Executor(kernel, hostess, stateManager);
    executor.load(config);
    console.log('Bringing topology up...');
    await executor.up();
    console.log('Topology running for 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('\nBringing topology down...');
    await executor.down();
    console.log('Done.');
    process.exit(0);
}
main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
//# sourceMappingURL=config-runner.js.map