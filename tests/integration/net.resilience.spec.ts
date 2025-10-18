import { describe, it, expect } from 'vitest';
import { TCPPipeClient } from '../../src/pipes/adapters/TCPPipe.js';

describe('Network Resilience', () => {
  it('TCPPipe handles connection errors with clear messages', async () => {
    const client = new TCPPipeClient({ port: 30099, timeout: 1000 });
    
    try {
      await client.connect();
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeDefined();
      expect(err.code).toBe('ECONNREFUSED');
    }
  });
});
