import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hostess } from '../src/hostess/Hostess.js';
import { buildServerManifest } from '../src/hostess/client.js';

describe('Hostess', () => {
  let hostess: Hostess;

  beforeEach(() => {
    hostess = new Hostess({ heartbeatIntervalMs: 5000, evictionThresholdMs: 20000 });
    hostess.startEvictionLoop();
    vi.useFakeTimers();
  });

  afterEach(() => {
    hostess.stopEvictionLoop();
    vi.useRealTimers();
  });

  function registerRenderer() {
    const manifest = buildServerManifest({
      fqdn: 'localhost',
      servername: 'renderer',
      classHex: '0x0002',
      owner: 'system',
      terminals: [{ name: 'display', type: 'local', direction: 'input' }],
      capabilities: { type: 'output', accepts: ['terminal-state'], produces: [] }
    });
    return hostess.register(manifest);
  }

  it('registers and queries by capabilities', () => {
    const id = registerRenderer();
    const results = hostess.query({ type: 'output', accepts: 'terminal-state', availableOnly: true });
    expect(results.find(e => e.identity === id)).toBeTruthy();
  });

  it('marks in-use and back to available', () => {
    const id = registerRenderer();
    hostess.markInUse(id, 'display', 'connectome-1');
    let results = hostess.query({ type: 'output', accepts: 'terminal-state', availableOnly: true });
    expect(results.find(e => e.identity === id)).toBeFalsy();

    hostess.markAvailable(id, 'display');
    results = hostess.query({ type: 'output', accepts: 'terminal-state', availableOnly: true });
    expect(results.find(e => e.identity === id)).toBeTruthy();
  });

  it('evicts after missed heartbeats', () => {
    const id = registerRenderer();
    vi.advanceTimersByTime(21000);
    vi.advanceTimersByTime(3000);
    const results = hostess.query({ availableOnly: true });
    expect(results.find(e => e.identity === id)).toBeFalsy();
  });

  it('heartbeat maintains liveness', () => {
    const id = registerRenderer();
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(4900);
      hostess.heartbeat(id);
      vi.advanceTimersByTime(200);
    }
    const results = hostess.query({ availableOnly: true });
    expect(results.find(e => e.identity === id)).toBeTruthy();
  });
});
