import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { createError, formatError, MkError, ERROR_CATALOG } from '../../src/mk/errors.js';

describe('MkError class', () => {
  it('creates error with code, message, and remediation', () => {
    const error = createError('CONFIG_NOT_FOUND');
    
    expect(error).toBeInstanceOf(MkError);
    expect(error.code).toBe('CONFIG_NOT_FOUND');
    expect(error.message).toBe('Configuration file not found');
    expect(error.remediation).toBe('Run: mk init --preset tty');
    expect(error.docs).toBe('https://mkolbol.dev/docs/config#locations');
  });

  it('creates error with context', () => {
    const error = createError('CONFIG_PARSE', { 
      file: 'bad.yaml', 
      line: 12, 
      column: 7 
    });
    
    expect(error.context).toEqual({ file: 'bad.yaml', line: 12, column: 7 });
  });

  it('converts to JSON', () => {
    const error = createError('MODULE_NOT_FOUND', { details: { module: 'test-module' } });
    const json = error.toJSON();
    
    expect(json).toEqual({
      code: 'MODULE_NOT_FOUND',
      message: expect.stringContaining('Required module not found'),
      remediation: 'Run: npm install',
      context: { details: { module: 'test-module' } },
      docs: 'https://mkolbol.dev/docs/modules',
    });
  });
});

describe('formatError - text format', () => {
  it('formats basic error in text', () => {
    const error = createError('HEALTH_CHECK_FAILED');
    const formatted = formatError(error, 'text');
    
    expect(formatted).toContain('[ERR] HEALTH_CHECK_FAILED');
    expect(formatted).toContain('Health check failed');
    expect(formatted).toContain('Fix: Run: mk doctor --verbose');
  });

  it('formats error with file location', () => {
    const error = createError('CONFIG_PARSE', { 
      file: 'bad.yaml', 
      line: 12, 
      column: 7 
    });
    const formatted = formatError(error, 'text');
    
    expect(formatted).toContain('[ERR] CONFIG_PARSE');
    expect(formatted).toContain('at bad.yaml:12:7');
    expect(formatted).toContain('Failed to parse configuration file');
  });

  it('formats error with expected values', () => {
    const error = createError('SCHEMA_INVALID', { 
      path: '$.topology.nodes[0].runMode',
      expected: ['inproc', 'worker', 'process'] 
    });
    const formatted = formatError(error, 'text');
    
    expect(formatted).toContain('[ERR] SCHEMA_INVALID');
    expect(formatted).toContain('at $.topology.nodes[0].runMode');
    expect(formatted).toContain('Expected: inproc, worker, process');
  });

  it('formats standard Error in text', () => {
    const error = new Error('Something went wrong');
    const formatted = formatError(error, 'text');
    
    expect(formatted).toBe('Error: Something went wrong');
  });
});

describe('formatError - JSON format', () => {
  it('formats error in JSON', () => {
    const error = createError('CONFIG_NOT_FOUND', { file: 'mk.yaml' });
    const formatted = formatError(error, 'json');
    const parsed = JSON.parse(formatted);
    
    expect(parsed.code).toBe('CONFIG_NOT_FOUND');
    expect(parsed.message).toBe('Configuration file not found');
    expect(parsed.remediation).toBe('Run: mk init --preset tty');
    expect(parsed.context).toEqual({ file: 'mk.yaml' });
    expect(parsed.docs).toBe('https://mkolbol.dev/docs/config#locations');
  });

  it('formats standard Error in JSON', () => {
    const error = new Error('Something went wrong');
    const formatted = formatError(error, 'json');
    const parsed = JSON.parse(formatted);
    
    expect(parsed.code).toBe('UNKNOWN_ERROR');
    expect(parsed.message).toBe('Something went wrong');
    expect(parsed.remediation).toBe('Check logs for more details');
  });
});

describe('Error catalog', () => {
  it('contains all expected error codes', () => {
    const expectedCodes = [
      'CONFIG_NOT_FOUND',
      'CONFIG_INVALID',
      'CONFIG_PARSE',
      'MODULE_NOT_FOUND',
      'HEALTH_CHECK_FAILED',
      'SCHEMA_INVALID',
      'TOPOLOGY_INVALID',
      'RUNTIME_ERROR',
      'FILE_NOT_FOUND',
      'INVALID_ARGUMENT',
      'UNKNOWN_COMMAND',
      'PERMISSION_DENIED',
      'DEPENDENCY_ERROR',
      'NETWORK_ERROR',
      'TIMEOUT',
    ];
    
    for (const code of expectedCodes) {
      expect(ERROR_CATALOG).toHaveProperty(code);
      expect(ERROR_CATALOG[code as keyof typeof ERROR_CATALOG]).toHaveProperty('code');
      expect(ERROR_CATALOG[code as keyof typeof ERROR_CATALOG]).toHaveProperty('message');
      expect(ERROR_CATALOG[code as keyof typeof ERROR_CATALOG]).toHaveProperty('remediation');
    }
  });

  it('all errors have non-empty messages and remediations', () => {
    for (const [code, definition] of Object.entries(ERROR_CATALOG)) {
      expect(definition.message).toBeTruthy();
      expect(definition.message.length).toBeGreaterThan(0);
      expect(definition.remediation).toBeTruthy();
      expect(definition.remediation.length).toBeGreaterThan(0);
    }
  });
});

describe('mk CLI error output', () => {
  it('outputs UNKNOWN_COMMAND error in text format', () => {
    const mkPath = join(process.cwd(), 'dist', 'scripts', 'mk.js');
    const r = spawnSync('node', [mkPath, 'nonexistent'], { encoding: 'utf8' });
    
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('[ERR] UNKNOWN_COMMAND');
    expect(r.stderr).toContain('Unknown command');
    expect(r.stderr).toContain('Fix: Run: mk --help');
  });

  it('outputs UNKNOWN_COMMAND error in JSON format', () => {
    const mkPath = join(process.cwd(), 'dist', 'scripts', 'mk.js');
    const r = spawnSync('node', [mkPath, 'nonexistent', '--json'], { encoding: 'utf8' });
    
    expect(r.status).not.toBe(0);
    
    const parsed = JSON.parse(r.stderr);
    expect(parsed.code).toBe('UNKNOWN_COMMAND');
    expect(parsed.message).toContain('Unknown command');
    expect(parsed.remediation).toBe('Run: mk --help');
  });
});

