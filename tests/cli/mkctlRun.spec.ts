import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';

describe('mkctl run', () => {
  const mkctlPath = resolve(__dirname, '../../scripts/mkctl.ts');
  const testConfigDir = join(__dirname, '../fixtures/cli-configs');
  let tempFiles: string[] = [];

  beforeEach(() => {
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    tempFiles.forEach(file => {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    });
    tempFiles = [];
  });

  function runMkctl(args: string[], timeout: number = 5000): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('tsx', [mkctlPath, ...args], {
        cwd: join(__dirname, '../..'),
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  describe('--file argument parsing', () => {
    it('should error when --file is missing', async () => {
      const result = await runMkctl(['run'], 1000);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Usage: mkctl run --file <path>');
    });

    it('should error when --file has no value', async () => {
      const result = await runMkctl(['run', '--file'], 1000);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Usage: mkctl run --file <path>');
    });

    it('should error when config file does not exist', async () => {
      const result = await runMkctl(['run', '--file', '/nonexistent/config.yml'], 1000);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toBeTruthy();
    });
  });

  describe('--duration argument', () => {
    const validConfig = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 500

connections: []
`;

    it('should default to 5 seconds when --duration is not provided', async () => {
      const configPath = join(testConfigDir, 'duration-default.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const start = Date.now();
      const result = await runMkctl(['run', '--file', configPath], 8000);
      const elapsed = Date.now() - start;

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Topology running for 5 seconds');
      expect(elapsed).toBeGreaterThanOrEqual(5000);
      expect(elapsed).toBeLessThan(6000);
    }, 10000);

    it('should respect --duration argument', async () => {
      const configPath = join(testConfigDir, 'duration-custom.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const start = Date.now();
      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);
      const elapsed = Date.now() - start;

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Topology running for 1 seconds');
      expect(elapsed).toBeGreaterThanOrEqual(1000);
      expect(elapsed).toBeLessThan(2000);
    });

    it('should handle --duration before --file', async () => {
      const configPath = join(testConfigDir, 'duration-order.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const start = Date.now();
      const result = await runMkctl(['run', '--duration', '1', '--file', configPath], 3000);
      const elapsed = Date.now() - start;

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Topology running for 1 seconds');
      expect(elapsed).toBeGreaterThanOrEqual(1000);
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('error handling', () => {
    it('should handle invalid YAML syntax', async () => {
      const invalidConfig = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 500
  invalid yaml syntax here: [[[
connections: []
`;
      const configPath = join(testConfigDir, 'invalid-syntax.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 2000);

      expect(result.code).toBe(1);
      expect(result.stderr).toBeTruthy();
    });

    it('should handle missing nodes array', async () => {
      const invalidConfig = `
connections: []
`;
      const configPath = join(testConfigDir, 'missing-nodes.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 2000);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Configuration must have a "nodes" array');
    });

    it('should handle missing connections array', async () => {
      const invalidConfig = `
nodes:
  - id: timer1
    module: TimerSource
`;
      const configPath = join(testConfigDir, 'missing-connections.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 2000);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Configuration must have a "connections" array');
    });

    it('should handle duplicate node IDs', async () => {
      const invalidConfig = `
nodes:
  - id: timer1
    module: TimerSource
  - id: timer1
    module: TimerSource
connections: []
`;
      const configPath = join(testConfigDir, 'duplicate-ids.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 2000);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Duplicate node id: "timer1"');
    });

    it('should handle invalid connection references', async () => {
      const invalidConfig = `
nodes:
  - id: timer1
    module: TimerSource
connections:
  - from: timer1.output
    to: nonexistent.input
`;
      const configPath = join(testConfigDir, 'invalid-connection.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 2000);

      expect(result.code).toBe(1);
      expect(result.stderr).toContain('node "nonexistent" referenced in "to" does not exist');
    });
  });

  describe('example configs', () => {
    const examplesDir = resolve(__dirname, '../../examples/configs');

    it('should successfully run basic.yml', async () => {
      const configPath = join(examplesDir, 'basic.yml');
      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Loading config from:');
      expect(result.stdout).toContain('Bringing topology up');
      expect(result.stdout).toContain('Topology running for 1 seconds');
      expect(result.stdout).toContain('Bringing topology down');
      expect(result.stdout).toContain('Done');
    });

    it('should successfully run multi.yml', async () => {
      const configPath = join(examplesDir, 'multi.yml');
      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Loading config from:');
      expect(result.stdout).toContain('Bringing topology up');
      expect(result.stdout).toContain('Topology running for 1 seconds');
      expect(result.stdout).toContain('Bringing topology down');
      expect(result.stdout).toContain('Done');
    });

    it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)('should successfully run external-pty.yaml', async () => {
      const configPath = join(examplesDir, 'external-pty.yaml');
      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Loading config from:');
      expect(result.stdout).toContain('Bringing topology up');
      expect(result.stdout).toContain('Done');
    });

    it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)('should successfully run external-stdio.yaml', async () => {
      const configPath = join(examplesDir, 'external-stdio.yaml');
      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Loading config from:');
      expect(result.stdout).toContain('Bringing topology up');
      expect(result.stdout).toContain('Done');
    });
  });

  describe('functional tests', () => {
    it('should handle simple timer topology with short duration', async () => {
      const config = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 200
  
  - id: upper1
    module: UppercaseTransform
  
  - id: console1
    module: ConsoleSink
    params:
      prefix: "[test]"

connections:
  - from: timer1.output
    to: upper1.input
  
  - from: upper1.output
    to: console1.input
`;
      const configPath = join(testConfigDir, 'simple-timer.yml');
      writeFileSync(configPath, config);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Bringing topology up');
      expect(result.stdout).toContain('Done');
    });

    it('should handle config with no connections', async () => {
      const config = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 500

connections: []
`;
      const configPath = join(testConfigDir, 'no-connections.yml');
      writeFileSync(configPath, config);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Done');
    });

    it('should handle JSON config format', async () => {
      const config = {
        nodes: [
          {
            id: 'timer1',
            module: 'TimerSource',
            params: { periodMs: 500 }
          }
        ],
        connections: []
      };
      const configPath = join(testConfigDir, 'json-config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Done');
    });
  });
});
