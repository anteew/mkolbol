export type Direction = 'input' | 'output';

export interface Terminal {
  name: string;
  direction: Direction;
}

export interface NodeDef {
  id: string;
  name: string;
  terminals: Terminal[];
  capabilities?: string[];
  humanReadable?: string;
  location?: string;
}

export interface TerminalRef {
  nodeId: string;
  terminal: string;
}

export interface PipeOptions {
  highWaterMark?: number;
  objectMode?: boolean;
}

export interface PipeMetadata {
  id: string;
  options?: PipeOptions;
  address: string;
  connected: boolean;
  flowRate?: number;
}

export type ConnectionType = 'direct' | 'split' | 'merge';

export interface ConnectionMetadata {
  id: string;
  from: string;
  to: string[];
  type: ConnectionType;
  establishedAt: Date;
  bytesTransferred?: number;
}

export interface TopologySnapshot {
  nodes: NodeDef[];
  pipes: PipeMetadata[];
  connections: ConnectionMetadata[];
}

export interface ValidationError {
  message: string;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export type TopologyEvent =
  | { type: 'node-added'; node: NodeDef }
  | { type: 'pipe-created'; pipe: PipeMetadata }
  | { type: 'connected'; connection: ConnectionMetadata }
  | { type: 'disconnected'; id: string }
  | { type: 'split'; connections: ConnectionMetadata[] }
  | { type: 'merge'; connections: ConnectionMetadata[] };
