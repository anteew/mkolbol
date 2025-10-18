import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { PeerApproval } from '../types/network.js';

const PEERS_STORE = '.mk/peers.json';

export function listPeers(): PeerApproval[] {
  if (!existsSync(PEERS_STORE)) return [];
  const data = readFileSync(PEERS_STORE, 'utf8');
  return JSON.parse(data).peers || [];
}

export function approvePeer(hostId: string, approvedBy?: string): void {
  const peers = listPeers();
  if (peers.some((p) => p.hostId === hostId)) {
    console.log(`Peer ${hostId} already approved`);
    return;
  }

  peers.push({ hostId, approvedAt: Date.now(), approvedBy });

  const dir = dirname(PEERS_STORE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PEERS_STORE, JSON.stringify({ peers }, null, 2));
  console.log(`Peer ${hostId} approved`);
}
