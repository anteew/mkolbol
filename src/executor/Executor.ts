import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { ModuleRegistry } from './moduleRegistry.js';
import { ExternalServerWrapper } from '../wrappers/ExternalServerWrapper.js';
import type { TopologyConfig, NodeConfig } from '../config/schema.js';
import type { ServerManifest, ExternalServerManifest } from '../types.js';

interface ModuleInstance {
  id: string;
  module: any;
  config: NodeConfig;
}

export class Executor {
  private config?: TopologyConfig;
  private modules = new Map<string, ModuleInstance>();
  private moduleRegistry: ModuleRegistry;

  constructor(
    private kernel: Kernel,
    private hostess: Hostess,
    private stateManager: StateManager
  ) {
    this.moduleRegistry = new ModuleRegistry();
  }

  load(config: TopologyConfig): void {
    this.config = config;
  }

  async up(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration loaded. Call load() first.');
    }

    for (const nodeConfig of this.config.nodes) {
      await this.instantiateNode(nodeConfig);
    }

    for (const conn of this.config.connections) {
      this.stateManager.connect(conn.from, conn.to);
    }

    for (const instance of this.modules.values()) {
      if (typeof instance.module.start === 'function') {
        instance.module.start();
      }
    }
  }

  async down(): Promise<void> {
    for (const instance of this.modules.values()) {
      if (typeof instance.module.stop === 'function') {
        instance.module.stop();
      }
    }

    this.modules.clear();
  }

  async restartNode(id: string): Promise<void> {
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

  registerModule(name: string, constructor: any): void {
    this.moduleRegistry.register(name, constructor);
  }

  async spawnExternalWrapper(manifest: ExternalServerManifest): Promise<ExternalServerWrapper> {
    const wrapper = new ExternalServerWrapper(this.kernel, this.hostess, manifest);
    await wrapper.spawn();

    this.stateManager.addNode({
      id: manifest.uuid!,
      name: manifest.servername,
      terminals: [
        { name: 'input', direction: 'input' as const },
        { name: 'output', direction: 'output' as const },
        { name: 'error', direction: 'output' as const }
      ],
      capabilities: manifest.capabilities.features || [],
      location: 'local'
    });

    return wrapper;
  }

  private async instantiateNode(nodeConfig: NodeConfig): Promise<void> {
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

    const manifest: ServerManifest = {
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
    this.hostess.register(manifest);

    this.stateManager.addNode({
      id: nodeConfig.id,
      name: nodeConfig.module,
      terminals: terminalsForStateManager,
      capabilities: [],
      location: 'local'
    });
  }

  private inferTerminalsForHostess(module: any) {
    const terminals: Array<{ name: string; type: 'local'; direction: 'input' | 'output' | 'multiplexer' | 'combiner' }> = [];
    if (module.inputPipe) {
      terminals.push({ name: 'input', type: 'local', direction: 'input' });
    }
    if (module.outputPipe) {
      terminals.push({ name: 'output', type: 'local', direction: 'output' });
    }
    return terminals;
  }

  private inferTerminalsForStateManager(module: any) {
    const terminals: Array<{ name: string; direction: 'input' | 'output' }> = [];
    if (module.inputPipe) {
      terminals.push({ name: 'input', direction: 'input' as const });
    }
    if (module.outputPipe) {
      terminals.push({ name: 'output', direction: 'output' as const });
    }
    return terminals;
  }

  private getClassHex(moduleName: string): string {
    if (moduleName.includes('Source') || moduleName.includes('Timer')) return '0x0001';
    if (moduleName.includes('Transform') || moduleName.includes('Uppercase')) return '0x0002';
    if (moduleName.includes('Sink') || moduleName.includes('Console')) return '0x0003';
    return '0x0000';
  }

  private getModuleType(moduleName: string): 'input' | 'source' | 'transform' | 'output' | 'routing' {
    if (moduleName.includes('Source') || moduleName.includes('Timer')) return 'source';
    if (moduleName.includes('Transform') || moduleName.includes('Uppercase')) return 'transform';
    if (moduleName.includes('Sink') || moduleName.includes('Console')) return 'output';
    return 'transform';
  }
}
