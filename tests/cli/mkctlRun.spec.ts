import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';

describe('mkctl run', () => {
  const mkctlPath = resolve(__dirname, '../../scripts/mkctl.ts');
  const testConfigDir = join(__dirname, '../fixtures/cli-configs');
  let tempFiles: string[] = [];

  const EXIT_CODES = {
    SUCCESS: 0,
    USAGE: 64,
    CONFIG_PARSE: 65,
    CONFIG_NOT_FOUND: 66,
    RUNTIME: 70,
    INTERRUPTED: 130,
  } as const;

  beforeEach(() => {
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    tempFiles.forEach((file) => {
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

  function spawnMkctl(
    args: string[],
    timeout: number = 5000,
  ): {
    proc: ChildProcess;
    result: Promise<{ stdout: string; stderr: string; code: number | null }>;
  } {
    const proc = spawn('tsx', [mkctlPath, ...args], {
      cwd: join(__dirname, '../..'),
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const result = new Promise<{ stdout: string; stderr: string; code: number | null }>(
      (resolve, reject) => {
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
      },
    );

    return { proc, result };
  }

  function runMkctl(args: string[], timeout: number = 5000) {
    return spawnMkctl(args, timeout).result;
  }

  describe('--file argument parsing', () => {
    it('should error when --file is missing', async () => {
      const result = await runMkctl(['run'], 1000);

      expect(result.code).toBe(EXIT_CODES.USAGE);
      expect(result.stderr).toContain('Usage: mkctl run --file <path>');
    });

    it('should error when --file has no value', async () => {
      const result = await runMkctl(['run', '--file'], 1000);

      expect(result.code).toBe(EXIT_CODES.USAGE);
      expect(result.stderr).toContain('Usage: mkctl run --file <path>');
    });

    it('should error when config file does not exist', async () => {
      const result = await runMkctl(['run', '--file', '/nonexistent/config.yml'], 1000);

      expect(result.code).toBe(EXIT_CODES.CONFIG_NOT_FOUND);
      expect(result.stderr).toContain('Config file not found');
      expect(result.stderr).toContain('Hint:');
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

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
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

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
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

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
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

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('Failed to read config');
      expect(result.stderr).toContain('Hint:');
    });

    it('should handle missing nodes array', async () => {
      const invalidConfig = `
connections: []
`;
      const configPath = join(testConfigDir, 'missing-nodes.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 2000);

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('Configuration must have a "nodes" array');
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('Hint:');
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

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('Configuration must have a "connections" array');
      expect(result.stderr).toContain('Hint:');
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

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('Duplicate node id: "timer1"');
      expect(result.stderr).toContain('Hint:');
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

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('node "nonexistent" referenced in "to" does not exist');
      expect(result.stderr).toContain('Hint:');
    });

    it('should map runtime errors to runtime exit code', async () => {
      const invalidRuntimeConfig = `
nodes:
  - id: crashy
    module: DoesNotExist

connections: []
`;
      const configPath = join(testConfigDir, 'runtime-error.yml');
      writeFileSync(configPath, invalidRuntimeConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 2000);

      expect(result.code).toBe(EXIT_CODES.RUNTIME);
      expect(result.stderr).toContain('Failed to start topology');
      expect(result.stderr).toContain('Hint:');
    });

    it('should exit with RUNTIME code when health check fails', async () => {
      const healthCheckFailConfig = `
nodes:
  - id: external1
    module: ExternalProcess
    params:
      command: /bin/sleep
      args: ["10"]
      ioMode: stdio
      healthCheck:
        type: command
        command: "exit 1"
        timeout: 1000
        retries: 2

connections: []
`;
      const configPath = join(testConfigDir, 'health-check-fail.yml');
      writeFileSync(configPath, healthCheckFailConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 5000);

      expect(result.code).toBe(EXIT_CODES.RUNTIME);
      expect(result.stderr).toContain('Health check failed');
      expect(result.stderr).toContain('Hint:');
    });
  });

  describe('example configs', () => {
    const examplesDir = resolve(__dirname, '../../examples/configs');

    it('should successfully run basic.yml', async () => {
      const configPath = join(examplesDir, 'basic.yml');
      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Loading config from:');
      expect(result.stdout).toContain('Bringing topology up');
      expect(result.stdout).toContain('Topology running for 1 seconds');
      expect(result.stdout).toContain('Bringing topology down');
      expect(result.stdout).toContain('Done');
    });

    it('should successfully run multi.yml', async () => {
      const configPath = join(examplesDir, 'multi.yml');
      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Loading config from:');
      expect(result.stdout).toContain('Bringing topology up');
      expect(result.stdout).toContain('Topology running for 1 seconds');
      expect(result.stdout).toContain('Bringing topology down');
      expect(result.stdout).toContain('Done');
    });

    it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
      'should successfully run external-pty.yaml',
      async () => {
        const configPath = join(examplesDir, 'external-pty.yaml');
        const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

        expect(result.code).toBe(EXIT_CODES.SUCCESS);
        expect(result.stdout).toContain('Loading config from:');
        expect(result.stdout).toContain('Bringing topology up');
        expect(result.stdout).toContain('Done');
      },
    );

    it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
      'should successfully run external-stdio.yaml',
      async () => {
        const configPath = join(examplesDir, 'external-stdio.yaml');
        const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

        expect(result.code).toBe(EXIT_CODES.SUCCESS);
        expect(result.stdout).toContain('Loading config from:');
        expect(result.stdout).toContain('Bringing topology up');
        expect(result.stdout).toContain('Done');
      },
    );
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

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
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

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Done');
    });

    it('should handle JSON config format', async () => {
      const config = {
        nodes: [
          {
            id: 'timer1',
            module: 'TimerSource',
            params: { periodMs: 500 },
          },
        ],
        connections: [],
      };
      const configPath = join(testConfigDir, 'json-config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--duration', '1'], 3000);

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Done');
    });
  });

  describe('signal handling', () => {
    const validConfig = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 200

connections: []
`;

    it('should shut down gracefully on SIGINT', async () => {
      const configPath = join(testConfigDir, 'sigint-config.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const { proc, result } = spawnMkctl(['run', '--file', configPath, '--duration', '10'], 10000);

      // Wait briefly for the topology to come up
      await new Promise((resolve) => setTimeout(resolve, 500));
      proc.kill('SIGINT');

      const outcome = await result;

      expect(outcome.code).toBe(EXIT_CODES.INTERRUPTED);
      expect(outcome.stdout).toContain('Received SIGINT');
      expect(outcome.stdout).toContain('Bringing topology down');
    });
  });

  describe('--dry-run flag', () => {
    it('should validate and exit with success for valid config', async () => {
      const validConfig = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 500

connections: []
`;
      const configPath = join(testConfigDir, 'dry-run-valid.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--dry-run'], 2000);

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Loading config from:');
      expect(result.stdout).toContain('Configuration is valid.');
      expect(result.stdout).not.toContain('Bringing topology up');
      expect(result.stdout).not.toContain('Topology running');
    });

    it('should exit with CONFIG_PARSE error for invalid config', async () => {
      const invalidConfig = `
nodes:
  - id: timer1
    module: TimerSource

connections:
  - from: timer1.output
    to: nonexistent.input
`;
      const configPath = join(testConfigDir, 'dry-run-invalid.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--dry-run'], 2000);

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('node "nonexistent" referenced in "to" does not exist');
      expect(result.stdout).not.toContain('Configuration is valid');
    });

    it('should exit with CONFIG_PARSE error for duplicate node IDs', async () => {
      const duplicateConfig = `
nodes:
  - id: timer1
    module: TimerSource
  - id: timer1
    module: TimerSource

connections: []
`;
      const configPath = join(testConfigDir, 'dry-run-duplicate.yml');
      writeFileSync(configPath, duplicateConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--dry-run'], 2000);

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('Duplicate node id: "timer1"');
      expect(result.stdout).not.toContain('Configuration is valid');
    });

    it('should exit with CONFIG_PARSE error for missing nodes array', async () => {
      const invalidConfig = `
connections: []
`;
      const configPath = join(testConfigDir, 'dry-run-missing-nodes.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--dry-run'], 2000);

      expect(result.code).toBe(EXIT_CODES.CONFIG_PARSE);
      expect(result.stderr).toContain('Configuration must have a "nodes" array');
      expect(result.stdout).not.toContain('Configuration is valid');
    });

    it('should exit with CONFIG_NOT_FOUND error when config file does not exist', async () => {
      const result = await runMkctl(
        ['run', '--file', '/nonexistent/config.yml', '--dry-run'],
        1000,
      );

      expect(result.code).toBe(EXIT_CODES.CONFIG_NOT_FOUND);
      expect(result.stderr).toContain('Config file not found');
      expect(result.stdout).not.toContain('Configuration is valid');
    });

    it('should work with --dry-run flag in any position', async () => {
      const validConfig = `
nodes:
  - id: timer1
    module: TimerSource

connections: []
`;
      const configPath = join(testConfigDir, 'dry-run-position.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--dry-run', '--file', configPath], 2000);

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Configuration is valid.');
    });

    it('should validate complex config with multiple nodes and connections', async () => {
      const complexConfig = `
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
      const configPath = join(testConfigDir, 'dry-run-complex.yml');
      writeFileSync(configPath, complexConfig);
      tempFiles.push(configPath);

      const result = await runMkctl(['run', '--file', configPath, '--dry-run'], 2000);

      expect(result.code).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Configuration is valid.');
    });
  });
});
