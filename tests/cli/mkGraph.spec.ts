import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('mk graph command', () => {
  const mkPath = join(process.cwd(), 'dist', 'scripts', 'mk.js');
  const testDir = join(tmpdir(), 'mk-graph-test');
  const testConfigPath = join(testDir, 'test-topology.json');

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    const testConfig = {
      nodes: [
        { id: 'source1', module: 'TimerSource', params: { periodMs: 1000 } },
        { id: 'transform1', module: 'TeeTransform', params: { outputCount: 2 }, runMode: 'worker' },
        { id: 'sink1', module: 'ConsoleSink', runMode: 'process' }
      ],
      connections: [
        { from: 'source1.output', to: 'transform1.input', type: 'direct' },
        { from: 'transform1.output', to: 'sink1.input', type: 'split' }
      ]
    };
    
    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  afterAll(() => {
    try {
      unlinkSync(testConfigPath);
    } catch (e) {
      // ignore
    }
  });

  it('prints ASCII graph by default', () => {
    const r = spawnSync('node', [mkPath, 'graph', testConfigPath], { encoding: 'utf8' });
    
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Topology Graph');
    expect(r.stdout).toContain('Nodes:');
    expect(r.stdout).toContain('Connections:');
    expect(r.stdout).toContain('source1');
    expect(r.stdout).toContain('transform1');
    expect(r.stdout).toContain('sink1');
    expect(r.stdout).toContain('TimerSource');
    expect(r.stdout).toContain('TeeTransform');
    expect(r.stdout).toContain('ConsoleSink');
    expect(r.stdout).toMatch(/3 nodes, 2 connections/);
  });

  it('prints JSON graph with --json flag', () => {
    const r = spawnSync('node', [mkPath, 'graph', testConfigPath, '--json'], { encoding: 'utf8' });
    
    expect(r.status).toBe(0);
    
    const graph = JSON.parse(r.stdout);
    
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
    expect(graph.metadata.nodeCount).toBe(3);
    expect(graph.metadata.edgeCount).toBe(2);
    expect(graph.metadata.generatedAt).toBeTruthy();
    
    expect(graph.nodes[0].id).toBe('source1');
    expect(graph.nodes[0].module).toBe('TimerSource');
    expect(graph.nodes[0].runMode).toBe('inproc');
    
    expect(graph.nodes[1].id).toBe('transform1');
    expect(graph.nodes[1].runMode).toBe('worker');
    
    expect(graph.edges[0].from).toBe('source1.output');
    expect(graph.edges[0].to).toBe('transform1.input');
    expect(graph.edges[0].type).toBe('direct');
  });

  it('displays ASCII graph with connection types', () => {
    const r = spawnSync('node', [mkPath, 'graph', testConfigPath], { encoding: 'utf8' });
    
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('source1.output');
    expect(r.stdout).toContain('transform1.input');
    expect(r.stdout).toMatch(/───>|═╤═>|═╧═>/);
  });

  it('shows error when no config file provided', () => {
    const r = spawnSync('node', [mkPath, 'graph'], { encoding: 'utf8' });
    
    expect(r.status).toBe(64);
    expect(r.stderr).toContain('Missing topology config file');
  });

  it('shows error for non-existent config file', () => {
    const r = spawnSync('node', [mkPath, 'graph', '/non/existent/file.json'], { encoding: 'utf8' });
    
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Error');
  });

  it('shows help when --help flag is used', () => {
    const r = spawnSync('node', [mkPath, 'graph', '--help'], { encoding: 'utf8' });
    
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Visualize topology graph');
    expect(r.stdout).toContain('Usage: mk graph');
  });

  it('displays node params in ASCII output', () => {
    const r = spawnSync('node', [mkPath, 'graph', testConfigPath], { encoding: 'utf8' });
    
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('periodMs');
    expect(r.stdout).toContain('outputCount');
  });

  it('includes runMode indicators in ASCII output', () => {
    const r = spawnSync('node', [mkPath, 'graph', testConfigPath], { encoding: 'utf8' });
    
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/[○⚙⚡]/);
  });
});
