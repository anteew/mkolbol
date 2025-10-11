import { Hostess } from './Hostess.js';
import { ServerManifest, Terminal, ServiceCapabilities } from '../types.js';

export function buildServerManifest(params: {
  fqdn: string;
  servername: string;
  classHex: string;
  owner: string;
  auth?: 'yes' | 'no' | 'optional';
  authMechanism?: string;
  terminals: Terminal[];
  capabilities: ServiceCapabilities;
  metadata?: Record<string, any>;
  uuid?: string;
}): ServerManifest {
  return {
    fqdn: params.fqdn,
    servername: params.servername,
    classHex: params.classHex,
    owner: params.owner,
    auth: params.auth ?? 'no',
    authMechanism: params.authMechanism ?? 'none',
    terminals: params.terminals,
    capabilities: params.capabilities,
    metadata: params.metadata,
    uuid: params.uuid
  };
}

export function registerWithHostess(hostess: Hostess, manifest: ServerManifest): string {
  return hostess.register(manifest);
}

export function startHeartbeat(hostess: Hostess, serverId: string, intervalMs = 5000): () => void {
  const timer = setInterval(() => hostess.heartbeat(serverId), intervalMs);
  return () => clearInterval(timer);
}
