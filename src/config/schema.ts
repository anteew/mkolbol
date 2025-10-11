export interface NodeConfig {
  id: string;
  module: string;
  params?: Record<string, any>;
}

export interface ConnectionConfig {
  from: string;
  to: string;
  type?: 'direct' | 'split' | 'merge';
}

export interface TopologyConfig {
  nodes: NodeConfig[];
  connections: ConnectionConfig[];
}
