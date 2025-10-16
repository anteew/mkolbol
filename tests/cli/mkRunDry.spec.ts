import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';

describe('mk run --dry-run', () => {
  const mkPath = join(__dirname, '../../scripts/mk.ts');
  const testConfigDir = join(__dirname, '../fixtures/cli-configs-mk');
  let tempFiles: string[] = [];

  const EXIT_CODES = {
    SUCCESS: 0,
    ERROR: 1,
    USAGE: 64,
    CONFIG_INVALID: 65,
    CONFIG_NOT_FOUND: 66,
    VALIDATION_ERROR: 65,
  } as const;

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

  function runMk(args: string[]): { stdout: string; stderr: string; status: number | null } {
    const result = spawnSync('tsx', [mkPath, ...args], {
      encoding: 'utf8',
      cwd: join(__dirname, '../..'),
      env: { ...process.env }
    });
    return result;
  }

  describe('argument parsing', () => {
    it('should error when topology file is missing', () => {
      const result = runMk(['run', '--dry-run']);
      
      expect(result.status).toBe(EXIT_CODES.USAGE);
      expect(result.stderr).toContain('Missing topology file');
      expect(result.stderr).toContain('Usage: mk run <topology-file>');
    });

    it('should error when config file does not exist', () => {
      const result = runMk(['run', '/nonexistent/config.yml', '--dry-run']);
      
      expect(result.status).toBe(EXIT_CODES.CONFIG_NOT_FOUND);
      expect(result.stderr).toContain('Config file not found');
    });

    it('should accept --dry-run before topology file', () => {
      const validConfig = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 500

connections: []
`;
      const configPath = join(testConfigDir, 'dry-run-order.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', '--dry-run', configPath]);

      expect(result.status).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Configuration is valid');
    });
  });

  describe('validation success', () => {
    it('should validate valid YAML config', () => {
      const validConfig = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 500

connections: []
`;
      const configPath = join(testConfigDir, 'valid.yml');
      writeFileSync(configPath, validConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Configuration is valid');
      expect(result.stdout).not.toContain('Not implemented yet');
    });

    it('should validate valid JSON config', () => {
      const validConfig = {
        nodes: [
          {
            id: 'timer1',
            module: 'TimerSource',
            params: { periodMs: 500 }
          }
        ],
        connections: []
      };
      const configPath = join(testConfigDir, 'valid.json');
      writeFileSync(configPath, JSON.stringify(validConfig, null, 2));
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Configuration is valid');
    });

    it('should validate complex topology', () => {
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
      const configPath = join(testConfigDir, 'complex.yml');
      writeFileSync(configPath, complexConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.SUCCESS);
      expect(result.stdout).toContain('Configuration is valid');
    });
  });

  describe('validation errors', () => {
    it('should fail on invalid YAML syntax', () => {
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

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.CONFIG_INVALID);
      expect(result.stderr).toContain('Failed to parse config file');
    });

    it('should fail on missing nodes array', () => {
      const invalidConfig = `
connections: []
`;
      const configPath = join(testConfigDir, 'missing-nodes.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('Configuration must have a "nodes" array');
    });

    it('should fail on missing connections array', () => {
      const invalidConfig = `
nodes:
  - id: timer1
    module: TimerSource
`;
      const configPath = join(testConfigDir, 'missing-connections.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('Configuration must have a "connections" array');
    });

    it('should fail on duplicate node IDs', () => {
      const duplicateConfig = `
nodes:
  - id: timer1
    module: TimerSource
  - id: timer1
    module: TimerSource

connections: []
`;
      const configPath = join(testConfigDir, 'duplicate-ids.yml');
      writeFileSync(configPath, duplicateConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('Duplicate node id: "timer1"');
    });

    it('should fail on invalid connection references', () => {
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

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('node "nonexistent" referenced in "to" does not exist');
    });

    it('should fail on missing node id', () => {
      const invalidConfig = `
nodes:
  - module: TimerSource

connections: []
`;
      const configPath = join(testConfigDir, 'missing-id.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('is missing required field "id"');
    });

    it('should fail on missing module', () => {
      const invalidConfig = `
nodes:
  - id: timer1

connections: []
`;
      const configPath = join(testConfigDir, 'missing-module.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('is missing required field "module"');
    });

    it('should fail on invalid address format', () => {
      const invalidConfig = `
nodes:
  - id: timer1
    module: TimerSource

connections:
  - from: timer1-output
    to: console1.input
`;
      const configPath = join(testConfigDir, 'invalid-address.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(EXIT_CODES.VALIDATION_ERROR);
      expect(result.stderr).toContain('Configuration validation failed');
      expect(result.stderr).toContain('must be in format "node.terminal"');
    });
  });

  describe('error code mapping', () => {
    it('should return exit code 65 for CONFIG_INVALID', () => {
      const invalidConfig = 'not valid yaml or json [[[';
      const configPath = join(testConfigDir, 'invalid-parse.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(65);
    });

    it('should return exit code 66 for CONFIG_NOT_FOUND', () => {
      const result = runMk(['run', '/nonexistent/config.yml', '--dry-run']);

      expect(result.status).toBe(66);
    });

    it('should return exit code 65 for VALIDATION_ERROR', () => {
      const invalidConfig = `
nodes: []
connections: []
`;
      const configPath = join(testConfigDir, 'empty-nodes.yml');
      writeFileSync(configPath, invalidConfig);
      tempFiles.push(configPath);

      const result = runMk(['run', configPath, '--dry-run']);

      expect(result.status).toBe(0);
    });
  });
});
