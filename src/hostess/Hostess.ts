import crypto from 'node:crypto';
import { CapabilityQuery, GuestBookEntry, ServerManifest, buildServerIdentity } from '../types.js';
import { TestEventEnvelope, createEvent } from '../logging/TestEvent.js';
import { createLogger } from '../logging/logger.js';
import { debug } from '../debug/api.js';

interface HostessOptions {
  heartbeatIntervalMs?: number;
  evictionThresholdMs?: number;
  logger?: (evt: TestEventEnvelope) => void;
}

export class Hostess {
  private guestBook = new Map<string, GuestBookEntry>();
  private interval?: NodeJS.Timeout;
  private readonly heartbeatIntervalMs: number;
  private readonly evictionThresholdMs: number;
  private readonly logger?: (evt: TestEventEnvelope) => void;

  constructor(opts: HostessOptions = {}) {
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 5000;
    this.evictionThresholdMs = opts.evictionThresholdMs ?? 20000;
    this.logger = opts.logger;
    if (!this.logger && process.env.LAMINAR_DEBUG === '1') {
      const suite = process.env.LAMINAR_SUITE || 'debug';
      const caseName = (process.env.LAMINAR_CASE || 'hostess').replace(/[^a-zA-Z0-9-_]/g, '_');
      const logger = createLogger(suite, caseName);
      this.logger = (evt) => logger.emit(evt.evt, { payload: evt.payload, id: evt.id, corr: evt.corr, phase: evt.phase, lvl: evt.lvl });
    }
  }

  register(entry: ServerManifest): string {
    const uuid = entry.uuid ?? crypto.randomUUID();
    const identity = buildServerIdentity({
      fqdn: entry.fqdn,
      servername: entry.servername,
      classHex: entry.classHex,
      owner: entry.owner,
      auth: entry.auth,
      authMechanism: entry.authMechanism,
      uuid
    });
    const inUse: Record<string, string | undefined> = {};
    for (const t of entry.terminals) inUse[t.name] = undefined;

    const gbe: GuestBookEntry = {
      id: identity,
      identity,
      fqdn: entry.fqdn,
      servername: entry.servername,
      classHex: entry.classHex,
      owner: entry.owner,
      auth: entry.auth,
      authMechanism: entry.authMechanism,
      uuid,
      terminals: entry.terminals.slice(),
      capabilities: { ...entry.capabilities, accepts: entry.capabilities.accepts?.slice(), produces: entry.capabilities.produces?.slice(), features: entry.capabilities.features?.slice() },
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
      lastHeartbeat: Date.now(),
      inUse,
      available: this.computeAvailable(inUse)
    };

    this.guestBook.set(identity, gbe);
    this.logger?.(createEvent('hostess:register', 'hostess', {
      id: identity,
      payload: { fqdn: entry.fqdn, servername: entry.servername, uuid }
    }));
    debug.emit('hostess', 'register', {
      identity,
      fqdn: entry.fqdn,
      servername: entry.servername,
      uuid,
      terminals: entry.terminals.length
    });
    return identity;
  }

  heartbeat(serverId: string): void {
    const entry = this.guestBook.get(serverId);
    if (!entry) return;
    entry.lastHeartbeat = Date.now();
    this.logger?.(createEvent('hostess:heartbeat', 'hostess', {
      id: serverId
    }));
    debug.emit('hostess', 'heartbeat', { serverId });
  }

  markInUse(serverId: string, terminalName: string, connectomeId: string): void {
    const entry = this.guestBook.get(serverId);
    if (!entry) return;
    if (!(terminalName in entry.inUse)) return;
    entry.inUse[terminalName] = connectomeId;
    entry.available = this.computeAvailable(entry.inUse) && this.isLive(entry);
    this.logger?.(createEvent('hostess:markInUse', 'hostess', {
      id: serverId,
      payload: { terminalName, connectomeId }
    }));
    debug.emit('hostess', 'markInUse', { serverId, terminalName, connectomeId });
  }

  markAvailable(serverId: string, terminalName: string): void {
    const entry = this.guestBook.get(serverId);
    if (!entry) return;
    if (!(terminalName in entry.inUse)) return;
    entry.inUse[terminalName] = undefined;
    entry.available = this.computeAvailable(entry.inUse) && this.isLive(entry);
  }

  query(filter: CapabilityQuery = {}): GuestBookEntry[] {
    const results: GuestBookEntry[] = [];
    for (const entry of this.guestBook.values()) {
      if (filter.type && entry.capabilities.type !== filter.type) continue;
      if (filter.classHex && entry.classHex !== filter.classHex) continue;
      if (filter.accepts) {
        const acc = entry.capabilities.accepts ?? [];
        if (!acc.includes(filter.accepts)) continue;
      }
      if (filter.produces) {
        const prod = entry.capabilities.produces ?? [];
        if (!prod.includes(filter.produces)) continue;
      }
      if (filter.features && filter.features.length) {
        const feats = entry.capabilities.features ?? [];
        const hasAll = filter.features.every(f => feats.includes(f));
        if (!hasAll) continue;
      }
      const live = this.isLive(entry);
      const available = entry.available && live;
      if (filter.availableOnly && !available) continue;
      results.push(entry);
    }
    return results;
  }

  list(): GuestBookEntry[] {
    return Array.from(this.guestBook.values());
  }

  startEvictionLoop(): void {
    if (this.interval) return;
    this.interval = setInterval(() => {
      const now = Date.now();
      for (const entry of this.guestBook.values()) {
        if (now - entry.lastHeartbeat > this.evictionThresholdMs) {
          entry.available = false;
        } else {
          entry.available = this.computeAvailable(entry.inUse);
        }
      }
    }, Math.max(1000, Math.floor(this.heartbeatIntervalMs / 2)));
  }

  stopEvictionLoop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  private isLive(entry: GuestBookEntry): boolean {
    return Date.now() - entry.lastHeartbeat <= this.evictionThresholdMs;
  }

  private computeAvailable(inUse: Record<string, string | undefined>): boolean {
    return Object.values(inUse).some(v => v === undefined);
  }
}
