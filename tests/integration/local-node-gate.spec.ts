import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config/loader.js';

describe('MK_LOCAL_NODE gate', () => {
  const originalEnv = process.env.MK_LOCAL_NODE;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.MK_LOCAL_NODE = originalEnv;
    } else {
      delete process.env.MK_LOCAL_NODE;
    }
  });

  it('allows config without network features when MK_LOCAL_NODE=1', () => {
    process.env.MK_LOCAL_NODE = '1';

    const config = `
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 100
connections: []
`;

    expect(() => loadConfig(config)).not.toThrow();
  });

  it('rejects config with type=network when MK_LOCAL_NODE=1', () => {
    process.env.MK_LOCAL_NODE = '1';

    const config = `
nodes:
  - id: net1
    module: NetworkModule
    params:
      type: network
connections: []
`;

    expect(() => loadConfig(config)).toThrow(/uses network features.*MK_LOCAL_NODE=1/);
  });

  it('rejects config with address parameter when MK_LOCAL_NODE=1', () => {
    process.env.MK_LOCAL_NODE = '1';

    const config = `
nodes:
  - id: net1
    module: NetworkModule
    params:
      address: "tcp://localhost:9000"
connections: []
`;

    expect(() => loadConfig(config)).toThrow(/uses network features.*MK_LOCAL_NODE=1/);
  });

  it('allows config with network features when MK_LOCAL_NODE is not set', () => {
    delete process.env.MK_LOCAL_NODE;

    const config = `
nodes:
  - id: net1
    module: NetworkModule
    params:
      type: network
      address: "tcp://localhost:9000"
connections: []
`;

    expect(() => loadConfig(config)).not.toThrow();
  });

  it('allows config with network features when MK_LOCAL_NODE=0', () => {
    process.env.MK_LOCAL_NODE = '0';

    const config = `
nodes:
  - id: net1
    module: NetworkModule
    params:
      type: network
connections: []
`;

    expect(() => loadConfig(config)).not.toThrow();
  });
});
