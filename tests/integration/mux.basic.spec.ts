import { describe, it, expect } from 'vitest';
import { FrameMux } from '../../src/net/mux.js';
import { PassThrough } from 'stream';

describe('FrameMux basic', () => {
  it('creates multiple logical streams', () => {
    const transport = new PassThrough();
    const mux = new FrameMux(transport);
    
    const stream1 = mux.createStream();
    const stream2 = mux.createStream();
    
    expect(stream1).toBeDefined();
    expect(stream2).toBeDefined();
  });
});
