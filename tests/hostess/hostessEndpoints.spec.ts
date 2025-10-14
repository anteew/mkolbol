import { describe, it, expect, beforeEach } from 'vitest';
import { Hostess } from '../../src/hostess/Hostess.js';
import type { HostessEndpoint } from '../../src/types.js';

describe('Hostess Endpoints', () => {
  let hostess: Hostess;

  beforeEach(() => {
    hostess = new Hostess();
  });

  describe('registerEndpoint', () => {
    it('should register an endpoint with id and coordinates', () => {
      const endpoint: HostessEndpoint = {
        type: 'inproc',
        coordinates: 'node:test1',
        metadata: { module: 'TestModule' }
      };

      hostess.registerEndpoint('test-id-1', endpoint);

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(1);
      expect(endpoints.get('test-id-1')).toEqual(endpoint);
    });

    it('should register multiple endpoints with different ids', () => {
      const endpoint1: HostessEndpoint = {
        type: 'inproc',
        coordinates: 'node:test1'
      };
      const endpoint2: HostessEndpoint = {
        type: 'worker',
        coordinates: 'node:test2'
      };

      hostess.registerEndpoint('id1', endpoint1);
      hostess.registerEndpoint('id2', endpoint2);

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(2);
      expect(endpoints.get('id1')).toEqual(endpoint1);
      expect(endpoints.get('id2')).toEqual(endpoint2);
    });

    it('should overwrite endpoint if registered with same id', () => {
      const endpoint1: HostessEndpoint = {
        type: 'inproc',
        coordinates: 'node:test1'
      };
      const endpoint2: HostessEndpoint = {
        type: 'external',
        coordinates: '/bin/bash'
      };

      hostess.registerEndpoint('same-id', endpoint1);
      hostess.registerEndpoint('same-id', endpoint2);

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(1);
      expect(endpoints.get('same-id')).toEqual(endpoint2);
    });

    it('should handle endpoint without metadata', () => {
      const endpoint: HostessEndpoint = {
        type: 'pty',
        coordinates: 'pid:12345'
      };

      hostess.registerEndpoint('pty-id', endpoint);

      const endpoints = hostess.listEndpoints();
      expect(endpoints.get('pty-id')).toEqual(endpoint);
      expect(endpoints.get('pty-id')?.metadata).toBeUndefined();
    });
  });

  describe('listEndpoints', () => {
    it('should return empty map when no endpoints registered', () => {
      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(0);
    });

    it('should return a copy of the endpoints map', () => {
      const endpoint: HostessEndpoint = {
        type: 'inproc',
        coordinates: 'node:test'
      };

      hostess.registerEndpoint('test-id', endpoint);
      const endpoints1 = hostess.listEndpoints();
      const endpoints2 = hostess.listEndpoints();

      // Should be different map instances
      expect(endpoints1).not.toBe(endpoints2);
      // But with same content
      expect(endpoints1.size).toBe(endpoints2.size);
      expect(endpoints1.get('test-id')).toEqual(endpoints2.get('test-id'));
    });

    it('should contain all registered endpoints', () => {
      hostess.registerEndpoint('e1', { type: 'inproc', coordinates: 'n1' });
      hostess.registerEndpoint('e2', { type: 'worker', coordinates: 'n2' });
      hostess.registerEndpoint('e3', { type: 'external', coordinates: 'n3' });
      hostess.registerEndpoint('e4', { type: 'pty', coordinates: 'n4' });

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(4);
      expect(endpoints.has('e1')).toBe(true);
      expect(endpoints.has('e2')).toBe(true);
      expect(endpoints.has('e3')).toBe(true);
      expect(endpoints.has('e4')).toBe(true);
    });
  });

  describe('endpoint types', () => {
    it('should support inproc endpoint type', () => {
      const endpoint: HostessEndpoint = {
        type: 'inproc',
        coordinates: 'node:timer1',
        metadata: {
          module: 'TimerSource',
          runMode: 'inproc'
        }
      };

      hostess.registerEndpoint('timer1-id', endpoint);
      const stored = hostess.listEndpoints().get('timer1-id');
      expect(stored?.type).toBe('inproc');
      expect(stored?.metadata?.runMode).toBe('inproc');
    });

    it('should support worker endpoint type', () => {
      const endpoint: HostessEndpoint = {
        type: 'worker',
        coordinates: 'node:worker1',
        metadata: {
          module: 'UppercaseTransform',
          runMode: 'worker'
        }
      };

      hostess.registerEndpoint('worker1-id', endpoint);
      const stored = hostess.listEndpoints().get('worker1-id');
      expect(stored?.type).toBe('worker');
      expect(stored?.metadata?.runMode).toBe('worker');
    });

    it('should support external endpoint type', () => {
      const endpoint: HostessEndpoint = {
        type: 'external',
        coordinates: '/usr/bin/python3 script.py',
        metadata: {
          cwd: '/tmp',
          ioMode: 'stdio'
        }
      };

      hostess.registerEndpoint('external-id', endpoint);
      const stored = hostess.listEndpoints().get('external-id');
      expect(stored?.type).toBe('external');
      expect(stored?.metadata?.ioMode).toBe('stdio');
    });

    it('should support pty endpoint type', () => {
      const endpoint: HostessEndpoint = {
        type: 'pty',
        coordinates: 'pid:54321',
        metadata: {
          cols: 80,
          rows: 24,
          terminalType: 'xterm-256color'
        }
      };

      hostess.registerEndpoint('pty-id', endpoint);
      const stored = hostess.listEndpoints().get('pty-id');
      expect(stored?.type).toBe('pty');
      expect(stored?.metadata?.cols).toBe(80);
      expect(stored?.metadata?.rows).toBe(24);
    });
  });

  describe('integration with server registration', () => {
    it('should allow endpoints to be registered alongside servers', () => {
      // Register a server
      const serverId = hostess.register({
        fqdn: 'localhost',
        servername: 'test-server',
        classHex: '0x0001',
        owner: 'test',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
          { name: 'input', type: 'local', direction: 'input' },
          { name: 'output', type: 'local', direction: 'output' }
        ],
        capabilities: {
          type: 'transform'
        }
      });

      // Register endpoint for the server
      hostess.registerEndpoint(serverId, {
        type: 'inproc',
        coordinates: 'node:test-server',
        metadata: { servername: 'test-server' }
      });

      // Verify both work
      const servers = hostess.list();
      expect(servers).toHaveLength(1);

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBe(1);
      expect(endpoints.get(serverId)?.coordinates).toBe('node:test-server');
    });
  });
});
