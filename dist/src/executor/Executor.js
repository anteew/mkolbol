import { ModuleRegistry } from './moduleRegistry.js';
import { ExternalServerWrapper } from '../wrappers/ExternalServerWrapper.js';
import { Worker, MessageChannel } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createLogger } from '../logging/logger.js';
import { debug } from '../debug/api.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class Executor {
    kernel;
    hostess;
    stateManager;
    config;
    modules = new Map();
    moduleRegistry;
    logger;
    constructor(kernel, hostess, stateManager, logger) {
        this.kernel = kernel;
        this.hostess = hostess;
        this.stateManager = stateManager;
        this.moduleRegistry = new ModuleRegistry();
        this.logger = logger;
        if (!this.logger && process.env.LAMINAR_DEBUG === '1') {
            const suite = process.env.LAMINAR_SUITE || 'debug';
            const caseName = (process.env.LAMINAR_CASE || 'executor').replace(/[^a-zA-Z0-9-_]/g, '_');
            this.logger = createLogger(suite, caseName);
        }
    }
    load(config) {
        this.config = config;
    }
    async up() {
        if (!this.config) {
            throw new Error('No configuration loaded. Call load() first.');
        }
        debug.emit('executor', 'start', { nodeCount: this.config.nodes.length });
        for (const nodeConfig of this.config.nodes) {
            await this.instantiateNode(nodeConfig);
        }
        for (const nodeConfig of this.config.nodes) {
            const instance = this.modules.get(nodeConfig.id);
            if (!instance)
                continue;
            if (instance.module.outputPipe) {
                const statePipe = this.stateManager.createPipe(`${nodeConfig.id}.output`, { objectMode: true });
                instance.module.outputPipe.pipe(statePipe);
            }
            if (instance.module.inputPipe) {
                const statePipe = this.stateManager.createPipe(`${nodeConfig.id}.input`, { objectMode: true });
                statePipe.pipe(instance.module.inputPipe);
            }
        }
        for (const conn of this.config.connections) {
            this.stateManager.connect(conn.from, conn.to);
            this.logger?.emit('edge.connect', {
                lvl: 'debug',
                id: `${conn.from}->${conn.to}`,
                payload: { from: conn.from, to: conn.to }
            });
        }
        for (const instance of this.modules.values()) {
            if (typeof instance.module.start === 'function') {
                instance.module.start();
            }
        }
    }
    async down() {
        debug.emit('executor', 'stop', { nodeCount: this.modules.size });
        for (const instance of this.modules.values()) {
            if (instance.worker) {
                instance.worker.postMessage({ type: 'shutdown' });
                await instance.worker.terminate();
            }
            else if (instance.process) {
                await this.drainAndTeardownProcess(instance);
            }
            else if (typeof instance.module.stop === 'function') {
                instance.module.stop();
            }
        }
        this.modules.clear();
    }
    async drainAndTeardownProcess(instance) {
        const proc = instance.process;
        if (!proc)
            return;
        debug.emit('executor', 'process.drain', { nodeId: instance.id });
        const drainPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                debug.emit('executor', 'process.drain.timeout', { nodeId: instance.id });
                resolve();
            }, 5000);
            if (instance.module.outputPipe) {
                instance.module.outputPipe.once('end', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            }
            else {
                clearTimeout(timeout);
                resolve();
            }
        });
        await drainPromise;
        debug.emit('executor', 'process.switch', { nodeId: instance.id });
        debug.emit('executor', 'process.teardown', { nodeId: instance.id });
        return new Promise((resolve) => {
            const killTimer = setTimeout(() => {
                if (proc && !proc.killed) {
                    proc.kill('SIGKILL');
                    debug.emit('executor', 'process.force-kill', { nodeId: instance.id });
                }
            }, 5000);
            proc.once('exit', () => {
                clearTimeout(killTimer);
                debug.emit('executor', 'process.teardown.complete', { nodeId: instance.id });
                resolve();
            });
            proc.kill('SIGTERM');
        });
    }
    async restartNode(id) {
        const instance = this.modules.get(id);
        if (!instance) {
            throw new Error(`Node not found: ${id}`);
        }
        if (typeof instance.module.stop === 'function') {
            instance.module.stop();
        }
        await this.instantiateNode(instance.config);
        const newInstance = this.modules.get(id);
        if (newInstance && typeof newInstance.module.start === 'function') {
            newInstance.module.start();
        }
    }
    registerModule(name, constructor) {
        this.moduleRegistry.register(name, constructor);
    }
    async spawnExternalWrapper(manifest) {
        const wrapper = new ExternalServerWrapper(this.kernel, this.hostess, manifest);
        await wrapper.spawn();
        this.stateManager.addNode({
            id: manifest.uuid,
            name: manifest.servername,
            terminals: [
                { name: 'input', direction: 'input' },
                { name: 'output', direction: 'output' },
                { name: 'error', direction: 'output' }
            ],
            capabilities: manifest.capabilities.features || [],
            location: 'local'
        });
        return wrapper;
    }
    async instantiateNode(nodeConfig) {
        const runMode = (nodeConfig.runMode ?? 'inproc');
        if (runMode === 'worker') {
            await this.instantiateWorkerNode(nodeConfig);
        }
        else if (runMode === 'process') {
            await this.instantiateProcessNode(nodeConfig);
        }
        else {
            await this.instantiateInProcNode(nodeConfig);
        }
    }
    async instantiateProcessNode(nodeConfig) {
        const { spawn } = await import('node:child_process');
        const { tmpdir } = await import('node:os');
        const { join } = await import('node:path');
        const { randomUUID } = await import('node:crypto');
        const command = nodeConfig.params?.command || 'cat';
        const args = nodeConfig.params?.args || [];
        const socketPath = join(tmpdir(), `mkolbol-${nodeConfig.id}-${randomUUID()}.sock`);
        debug.emit('executor', 'process.spawn', { nodeId: nodeConfig.id, command, args });
        const proc = spawn(command, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, MKOLBOL_SOCKET: socketPath }
        });
        const UnixPipeAdapter = (await import('../transport/unix/UnixPipeAdapter.js')).UnixPipeAdapter;
        const inputAdapter = new UnixPipeAdapter(`${socketPath}-in`);
        const outputAdapter = new UnixPipeAdapter(`${socketPath}-out`);
        await Promise.all([inputAdapter.listen(), outputAdapter.listen()]);
        const inputPipe = inputAdapter.createDuplex({ objectMode: true });
        const outputPipe = outputAdapter.createDuplex({ objectMode: true });
        const module = {
            inputPipe,
            outputPipe,
        };
        this.modules.set(nodeConfig.id, {
            id: nodeConfig.id,
            module,
            config: nodeConfig,
            process: proc
        });
        let lastHeartbeat = Date.now();
        const heartbeatTimeout = nodeConfig.params?.heartbeatTimeout || 30000;
        const heartbeatInterval = setInterval(() => {
            const elapsed = Date.now() - lastHeartbeat;
            if (elapsed > heartbeatTimeout) {
                debug.emit('executor', 'process.heartbeat.timeout', { nodeId: nodeConfig.id, elapsed }, 'error');
                proc.kill('SIGTERM');
                clearInterval(heartbeatInterval);
            }
        }, heartbeatTimeout / 2);
        proc.on('message', (msg) => {
            if (msg && msg.type === 'heartbeat') {
                lastHeartbeat = Date.now();
            }
        });
        const terminalsForHostess = this.inferTerminalsForHostess(module);
        const terminalsForStateManager = this.inferTerminalsForStateManager(module);
        const manifest = {
            fqdn: 'localhost',
            servername: nodeConfig.id,
            classHex: this.getClassHex(nodeConfig.module),
            owner: 'system',
            auth: 'no',
            authMechanism: 'none',
            terminals: terminalsForHostess,
            capabilities: {
                type: this.getModuleType(nodeConfig.module),
                accepts: [],
                produces: []
            }
        };
        const identity = this.hostess.register(manifest);
        this.hostess.registerEndpoint(identity, {
            type: 'process',
            coordinates: `node:${nodeConfig.id}`,
            metadata: {
                module: nodeConfig.module,
                runMode: 'process',
                command,
                args,
                socketPath
            }
        });
        this.stateManager.addNode({
            id: nodeConfig.id,
            name: nodeConfig.module,
            terminals: terminalsForStateManager,
            capabilities: [],
            location: 'process'
        });
        proc.on('error', (err) => {
            console.error(`[Executor] Process error for ${nodeConfig.id}:`, err);
            debug.emit('executor', 'process.error', { nodeId: nodeConfig.id, error: err.message }, 'error');
            clearInterval(heartbeatInterval);
        });
        proc.on('exit', (code) => {
            console.log(`[Executor] Process ${nodeConfig.id} exited with code ${code}`);
            debug.emit('executor', 'process.exit', { nodeId: nodeConfig.id, exitCode: code });
            clearInterval(heartbeatInterval);
            inputAdapter.close();
            outputAdapter.close();
        });
    }
    async instantiateInProcNode(nodeConfig) {
        const Constructor = this.moduleRegistry.get(nodeConfig.module);
        if (!Constructor) {
            throw new Error(`Module not found in registry: ${nodeConfig.module}`);
        }
        const params = nodeConfig.params || {};
        const module = new Constructor(this.kernel, ...Object.values(params));
        this.modules.set(nodeConfig.id, {
            id: nodeConfig.id,
            module,
            config: nodeConfig
        });
        const terminalsForHostess = this.inferTerminalsForHostess(module);
        const terminalsForStateManager = this.inferTerminalsForStateManager(module);
        const manifest = {
            fqdn: 'localhost',
            servername: nodeConfig.id,
            classHex: this.getClassHex(nodeConfig.module),
            owner: 'system',
            auth: 'no',
            authMechanism: 'none',
            terminals: terminalsForHostess,
            capabilities: {
                type: this.getModuleType(nodeConfig.module),
                accepts: [],
                produces: []
            }
        };
        const identity = this.hostess.register(manifest);
        this.hostess.registerEndpoint(identity, {
            type: 'inproc',
            coordinates: `node:${nodeConfig.id}`,
            metadata: {
                module: nodeConfig.module,
                runMode: 'inproc'
            }
        });
        this.stateManager.addNode({
            id: nodeConfig.id,
            name: nodeConfig.module,
            terminals: terminalsForStateManager,
            capabilities: [],
            location: 'local'
        });
    }
    async instantiateWorkerNode(nodeConfig) {
        const { port1: controlPort1, port2: controlPort2 } = new MessageChannel();
        const { port1: inputPort1, port2: inputPort2 } = new MessageChannel();
        const { port1: outputPort1, port2: outputPort2 } = new MessageChannel();
        const harnessPath = join(__dirname, 'workerHarness.js');
        const modulePath = this.getModulePath(nodeConfig.module);
        debug.emit('executor', 'worker.spawn', { nodeId: nodeConfig.id, module: nodeConfig.module });
        const worker = new Worker(harnessPath, {
            workerData: {
                nodeId: nodeConfig.id,
                modulePath,
                params: nodeConfig.params || {},
                controlPort: controlPort2,
                inputPort: inputPort2,
                outputPort: outputPort2,
            },
            transferList: [controlPort2, inputPort2, outputPort2]
        });
        const WorkerPipeAdapter = (await import('../transport/worker/WorkerPipeAdapter.js')).WorkerPipeAdapter;
        const inputPipe = new WorkerPipeAdapter(inputPort1).createDuplex({ objectMode: true });
        const outputPipe = new WorkerPipeAdapter(outputPort1).createDuplex({ objectMode: true });
        const module = {
            inputPipe,
            outputPipe,
        };
        this.modules.set(nodeConfig.id, {
            id: nodeConfig.id,
            module,
            config: nodeConfig,
            worker
        });
        const WorkerBusAdapter = (await import('../control/adapters/WorkerBusAdapter.js')).WorkerBusAdapter;
        const workerControlBus = new WorkerBusAdapter(controlPort1);
        await new Promise((resolve) => {
            const topic = workerControlBus.topic('control.hello');
            const handler = (msg) => {
                if (msg && msg.type === 'worker.ready') {
                    console.log(`[Executor] Worker ready: ${nodeConfig.id}`);
                    debug.emit('executor', 'worker.ready', { nodeId: nodeConfig.id, module: nodeConfig.module });
                    this.logger?.emit('worker.ready', {
                        lvl: 'info',
                        id: nodeConfig.id,
                        path: modulePath,
                        payload: { module: nodeConfig.module }
                    });
                    topic.off('data', handler);
                    resolve();
                }
            };
            topic.on('data', handler);
        });
        const terminalsForHostess = this.inferTerminalsForHostess(module);
        const terminalsForStateManager = this.inferTerminalsForStateManager(module);
        const manifest = {
            fqdn: 'localhost',
            servername: nodeConfig.id,
            classHex: this.getClassHex(nodeConfig.module),
            owner: 'system',
            auth: 'no',
            authMechanism: 'none',
            terminals: terminalsForHostess,
            capabilities: {
                type: this.getModuleType(nodeConfig.module),
                accepts: [],
                produces: []
            }
        };
        const identity = this.hostess.register(manifest);
        this.hostess.registerEndpoint(identity, {
            type: 'worker',
            coordinates: `node:${nodeConfig.id}`,
            metadata: {
                module: nodeConfig.module,
                runMode: 'worker'
            }
        });
        this.stateManager.addNode({
            id: nodeConfig.id,
            name: nodeConfig.module,
            terminals: terminalsForStateManager,
            capabilities: [],
            location: 'worker'
        });
        worker.on('error', (err) => {
            console.error(`[Executor] Worker error for ${nodeConfig.id}:`, err);
            debug.emit('executor', 'worker.error', { nodeId: nodeConfig.id, error: err.message }, 'error');
        });
        worker.on('exit', (code) => {
            console.log(`[Executor] Worker ${nodeConfig.id} exited with code ${code}`);
            debug.emit('executor', 'worker.exit', { nodeId: nodeConfig.id, exitCode: code });
            this.logger?.emit('worker.exit', {
                lvl: 'info',
                id: nodeConfig.id,
                path: modulePath,
                payload: { module: nodeConfig.module, exitCode: code }
            });
        });
    }
    getModulePath(moduleName) {
        const moduleMap = {
            'TimerSource': '../modules/timer.js',
            'UppercaseTransform': '../modules/uppercase.js',
            'ConsoleSink': '../modules/consoleSink.js',
        };
        const relativePath = moduleMap[moduleName];
        if (!relativePath) {
            throw new Error(`Unknown module for worker: ${moduleName}`);
        }
        return join(__dirname, relativePath);
    }
    inferTerminalsForHostess(module) {
        const terminals = [];
        if (module.inputPipe) {
            terminals.push({ name: 'input', type: 'local', direction: 'input' });
        }
        if (module.outputPipe) {
            terminals.push({ name: 'output', type: 'local', direction: 'output' });
        }
        return terminals;
    }
    inferTerminalsForStateManager(module) {
        const terminals = [];
        if (module.inputPipe) {
            terminals.push({ name: 'input', direction: 'input' });
        }
        if (module.outputPipe) {
            terminals.push({ name: 'output', direction: 'output' });
        }
        return terminals;
    }
    getClassHex(moduleName) {
        if (moduleName.includes('Source') || moduleName.includes('Timer'))
            return '0x0001';
        if (moduleName.includes('Transform') || moduleName.includes('Uppercase'))
            return '0x0002';
        if (moduleName.includes('Sink') || moduleName.includes('Console'))
            return '0x0003';
        return '0x0000';
    }
    getModuleType(moduleName) {
        if (moduleName.includes('Source') || moduleName.includes('Timer'))
            return 'source';
        if (moduleName.includes('Transform') || moduleName.includes('Uppercase'))
            return 'transform';
        if (moduleName.includes('Sink') || moduleName.includes('Console'))
            return 'output';
        return 'transform';
    }
}
//# sourceMappingURL=Executor.js.map