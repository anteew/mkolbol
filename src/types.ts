export type ServiceClassHex = string;

export type ModuleType = 'input' | 'source' | 'transform' | 'output' | 'routing';

export interface ServiceCapabilities {
  type: ModuleType;
  accepts?: string[];
  produces?: string[];
  features?: string[];
}

export type TerminalType = 'local' | 'network' | 'loopback';
export type TerminalDirection = 'input' | 'output' | 'multiplexer' | 'combiner';

export interface Terminal {
  name: string;
  type: TerminalType;
  direction: TerminalDirection;
}

export interface ServerManifest {
  fqdn: string;
  servername: string;
  classHex: ServiceClassHex;
  owner: string;
  auth: 'yes' | 'no' | 'optional';
  authMechanism: string;
  terminals: Terminal[];
  capabilities: ServiceCapabilities;
  metadata?: Record<string, any>;
  uuid?: string;
}

export interface GuestBookEntry {
  id: string;
  identity: string;
  fqdn: string;
  servername: string;
  classHex: ServiceClassHex;
  owner: string;
  auth: 'yes' | 'no' | 'optional';
  authMechanism: string;
  uuid: string;
  terminals: Terminal[];
  capabilities: ServiceCapabilities;
  metadata?: Record<string, any>;
  lastHeartbeat: number;
  inUse: Record<string, string | undefined>;
  available: boolean;
}

export interface CapabilityQuery {
  accepts?: string;
  produces?: string;
  features?: string[];
  type?: ModuleType;
  classHex?: ServiceClassHex;
  availableOnly?: boolean;
}

export function buildServerIdentity(parts: {
  fqdn: string;
  servername: string;
  classHex: ServiceClassHex;
  owner: string;
  auth: 'yes' | 'no' | 'optional';
  authMechanism: string;
  uuid: string;
}): string {
  const { fqdn, servername, classHex, owner, auth, authMechanism, uuid } = parts;
  return `${fqdn}:${servername}:${classHex}:${owner}:${auth}:${authMechanism}:${uuid}`;
}
