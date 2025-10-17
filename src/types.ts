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

export type IOMode = 'stdio' | 'pty' | 'socket';
export type RestartPolicy = 'never' | 'on-failure' | 'always';

export interface HealthCheckConfig {
  type: 'command' | 'http';
  command?: string;
  url?: string;
  timeout?: number;
  retries?: number;
}

export interface ExternalServerManifest extends ServerManifest {
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd: string;
  ioMode: IOMode;
  restart?: RestartPolicy;
  restartDelay?: number;
  maxRestarts?: number;
  terminalType?: string;
  initialCols?: number;
  initialRows?: number;
  encoding?: 'utf8' | 'binary';
  shell?: string;
  shellArgs?: string[];
  healthCheck?: HealthCheckConfig;
}

export interface ProcessInfo {
  pid: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface Cell {
  char: string;
  fg: string | null;
  bg: string | null;
}

export interface TerminalState {
  cells: Cell[][];
  cursorX: number;
  cursorY: number;
  rows: number;
  cols: number;
  scrollback: Cell[][];
  currentFg: string | null;
  currentBg: string | null;
}

export interface EscapeSequence {
  type: 'csi' | 'osc' | 'unknown';
  params?: number[];
  cmd?: string;
  length: number;
  raw?: string;
}

export interface HostessEndpoint {
  type: string;
  coordinates: string;
  metadata?: Record<string, any>;
}

export interface RoutingAnnouncement {
  id: string;
  type: string;
  coordinates: string;
  metadata?: Record<string, any>;
}

export interface RoutingEndpoint extends RoutingAnnouncement {
  announcedAt: number;
  updatedAt: number;
  expiresAt: number;
}
