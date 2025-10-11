import crypto from 'node:crypto';
import { CapabilityQuery, GuestBookEntry, ServerManifest, buildServerIdentity } from '../types.js';

interface HostessOptions {
  heartbeatIntervalMs?: number;
  evictionThresholdMs?: number;
}

export class Hostess {
  private guestBook = new Map<string, GuestBookEntry>();
  private interval?: NodeJS.Timeout;
  private readonly heartbeatIntervalMs: number;
  private readonly evictionThresholdMs: number;

  constructor(opts: HostessOptions = {}) {
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 5000;
    this.evictionThresholdMs = opts.evictionThresholdMs ?? 20000;
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
    return identity;
  }

  heartbeat(serverId: string): void {
    const entry = this.guestBook.get(serverId);
    if (!entry) return;
    entry.lastHeartbeat = Date.now();
  }

  markInUse(serverId: string, terminalName: string, connectomeId: string): void {
    const entry = this.guestBook.get(serverId);
    if (!entry) return;
    if (!(terminalName in entry.inUse)) return;
    entry.inUse[terminalName] = connectomeId;
    entry.available = this.computeAvailable(entry.inUse) && this.isLive(entry);
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
