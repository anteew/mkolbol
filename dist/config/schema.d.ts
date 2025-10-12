export interface NodeConfig {
    id: string;
    module: string;
    params?: Record<string, any>;
    runMode?: 'inproc' | 'worker';
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
//# sourceMappingURL=schema.d.ts.map