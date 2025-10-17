import { describe, it, expect } from 'vitest';
import { RoutingServer } from '../../src/router/RoutingServer.js';

describe('RoutingServer subscribe', () => {
  it('emits added event on new endpoint', () => {
    const router = new RoutingServer();
    const events: any[] = [];
    router.subscribe((e) => events.push(e));

    router.announce({ id: 'ep1', type: 'inproc', coordinates: 'node:ep1' });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('added');
    expect(events[0].endpoint.id).toBe('ep1');
  });

  it('emits updated event on re-announce', () => {
    const router = new RoutingServer();
    const events: any[] = [];

    router.announce({ id: 'ep1', type: 'inproc', coordinates: 'node:ep1' });
    router.subscribe((e) => events.push(e));
    router.announce({ id: 'ep1', type: 'inproc', coordinates: 'node:ep1' });

    expect(events[0].type).toBe('updated');
  });

  it('emits removed event on withdraw', () => {
    const router = new RoutingServer();
    const events: any[] = [];

    router.announce({ id: 'ep1', type: 'inproc', coordinates: 'node:ep1' });
    router.subscribe((e) => events.push(e));
    router.withdraw('ep1');

    expect(events[0].type).toBe('removed');
  });

  it('unsubscribe stops events', () => {
    const router = new RoutingServer();
    const events: any[] = [];
    const unsub = router.subscribe((e) => events.push(e));

    router.announce({ id: 'ep1', type: 'inproc', coordinates: 'node:ep1' });
    unsub();
    router.announce({ id: 'ep2', type: 'inproc', coordinates: 'node:ep2' });

    expect(events).toHaveLength(1);
  });
});
