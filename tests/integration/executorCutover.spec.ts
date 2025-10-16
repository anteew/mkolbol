import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';
import type { TopologyConfig } from '../../src/config/schema.js';
import { Readable, Writable } from 'node:stream';

describe('Executor Cutover Integration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let stateManager: StateManager;
  let executor: Executor;

  const testTimeout = 15000;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
    stateManager = new StateManager(kernel);
    executor = new Executor(kernel, hostess, stateManager);
    
    executor.setCutoverConfig({
      drainTimeout: 2000,
      killTimeout: 1000
    });
  });

  afterEach(async () => {
    if (executor) {
      await executor.down();
    }
  });

  it('should perform basic cutover of inproc node', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 100 } },
        { id: 'sink1', module: 'ConsoleSink', params: { prefix: '[test]' } }
      ],
      connections: [
        { from: 'timer1.output', to: 'sink1.input' }
      ]
    };

    executor.load(config);
    await executor.up();

    const topologyBefore = stateManager.getTopology();
    expect(topologyBefore.nodes).toHaveLength(2);
    expect(topologyBefore.connections).toHaveLength(1);

    await executor.cutover('timer1', 'timer2');

    const topologyAfter = stateManager.getTopology();
    expect(topologyAfter.nodes.find(n => n.id === 'timer1')).toBeUndefined();
    expect(topologyAfter.nodes.find(n => n.id === 'timer2')).toBeDefined();

    const newConnection = topologyAfter.connections.find(c => 
      c.from === 'timer2.output' && c.to.includes('sink1.input')
    );
    expect(newConnection).toBeDefined();

    await executor.down();
  }, testTimeout);

  it('should preserve node configuration during cutover', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 250 } }
      ],
      connections: []
    };

    executor.load(config);
    await executor.up();

    const servicesBefore = hostess.list();
    const timerBefore = servicesBefore.find(s => s.servername === 'timer1');
    expect(timerBefore).toBeDefined();

    await executor.cutover('timer1', 'timer-replacement');

    const servicesAfter = hostess.list();
    const timerOld = servicesAfter.find(s => s.servername === 'timer1');
    const timerNew = servicesAfter.find(s => s.servername === 'timer-replacement');
    
    expect(timerOld).toBeUndefined();
    expect(timerNew).toBeDefined();
    expect(timerNew?.classHex).toBe(timerBefore?.classHex);

    await executor.down();
  }, testTimeout);

  it('should handle cutover with multiple connections', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 100 } },
        { id: 'upper1', module: 'UppercaseTransform' },
        { id: 'sink1', module: 'ConsoleSink' }
      ],
      connections: [
        { from: 'timer1.output', to: 'upper1.input' },
        { from: 'upper1.output', to: 'sink1.input' }
      ]
    };

    executor.load(config);
    await executor.up();

    await executor.cutover('upper1', 'upper2');

    const topology = stateManager.getTopology();
    
    const incomingConn = topology.connections.find(c => 
      c.from === 'timer1.output' && c.to.includes('upper2.input')
    );
    const outgoingConn = topology.connections.find(c => 
      c.from === 'upper2.output' && c.to.includes('sink1.input')
    );
    
    expect(incomingConn).toBeDefined();
    expect(outgoingConn).toBeDefined();

    await executor.down();
  }, testTimeout);

  it('should throw error when old node does not exist', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 100 } }
      ],
      connections: []
    };

    executor.load(config);
    await executor.up();

    await expect(executor.cutover('nonexistent', 'newnode')).rejects.toThrow('Old node not found');

    await executor.down();
  }, testTimeout);

  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)('should cutover process-mode nodes', async () => {
    const config: TopologyConfig = {
      nodes: [
        { 
          id: 'cat1', 
          module: 'ExternalProcess',
          params: { 
            command: 'cat',
            args: []
          },
          runMode: 'process'
        }
      ],
      connections: []
    };

    executor.load(config);
    await executor.up();

    const endpointsBefore = hostess.listEndpoints();
    const catBefore = Array.from(endpointsBefore.entries()).find(
      ([_, ep]) => ep.coordinates === 'node:cat1'
    );
    expect(catBefore).toBeDefined();

    await executor.cutover('cat1', 'cat2');

    const endpointsAfter = hostess.listEndpoints();
    const catOld = Array.from(endpointsAfter.entries()).find(
      ([_, ep]) => ep.coordinates === 'node:cat1'
    );
    const catNew = Array.from(endpointsAfter.entries()).find(
      ([_, ep]) => ep.coordinates === 'node:cat2'
    );

    expect(catOld).toBeUndefined();
    expect(catNew).toBeDefined();
    expect(catNew![1].type).toBe('process');

    await executor.down();
  }, testTimeout);

  it('should handle cutover under data load without loss', async () => {
    const receivedData: any[] = [];
    let sinkStream: Writable | null = null;

    class DataCaptureSink {
      public inputPipe: Writable;

      constructor() {
        this.inputPipe = new Writable({
          objectMode: true,
          write(chunk: any, _encoding: string, callback: Function) {
            receivedData.push(chunk);
            callback();
          }
        });
        sinkStream = this.inputPipe;
      }

      start() {}
      stop() {}
    }

    class NumberSource {
      public outputPipe: Readable;
      private counter: number = 0;
      private interval: NodeJS.Timeout | null = null;

      constructor(kernel: Kernel, periodMs: number = 50) {
        this.outputPipe = new Readable({
          objectMode: true,
          read() {}
        });
      }

      start() {
        this.interval = setInterval(() => {
          this.outputPipe.push({ value: this.counter++, ts: Date.now() });
        }, 50);
      }

      stop() {
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = null;
        }
        this.outputPipe.push(null);
      }
    }

    executor.registerModule('NumberSource', NumberSource);
    executor.registerModule('DataCaptureSink', DataCaptureSink);

    const config: TopologyConfig = {
      nodes: [
        { id: 'source1', module: 'NumberSource', params: { periodMs: 50 } },
        { id: 'upper1', module: 'UppercaseTransform' },
        { id: 'sink1', module: 'DataCaptureSink' }
      ],
      connections: [
        { from: 'source1.output', to: 'upper1.input' },
        { from: 'upper1.output', to: 'sink1.input' }
      ]
    };

    executor.load(config);
    await executor.up();

    await new Promise(resolve => setTimeout(resolve, 200));

    const dataBeforeCutover = receivedData.length;
    expect(dataBeforeCutover).toBeGreaterThan(0);

    await executor.cutover('upper1', 'upper2');

    await new Promise(resolve => setTimeout(resolve, 200));

    const dataAfterCutover = receivedData.length;
    expect(dataAfterCutover).toBeGreaterThan(dataBeforeCutover);

    const values = receivedData.map((d: any) => d.value).filter((v: any) => v !== undefined);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);

    await executor.down();
  }, testTimeout);

  it('should respect drain timeout configuration', async () => {
    executor.setCutoverConfig({
      drainTimeout: 500,
      killTimeout: 200
    });

    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 100 } },
        { id: 'sink1', module: 'ConsoleSink' }
      ],
      connections: [
        { from: 'timer1.output', to: 'sink1.input' }
      ]
    };

    executor.load(config);
    await executor.up();

    const startTime = Date.now();
    await executor.cutover('timer1', 'timer2');
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(elapsed).toBeLessThan(5000);

    const topology = stateManager.getTopology();
    expect(topology.nodes.find(n => n.id === 'timer2')).toBeDefined();

    await executor.down();
  }, testTimeout);
});
