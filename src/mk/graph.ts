import type { TopologyConfig, NodeConfig, ConnectionConfig } from '../config/schema.js';

export interface GraphNode {
  id: string;
  module: string;
  params?: Record<string, any>;
  runMode?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type?: string;
}

export interface JsonGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    generatedAt: string;
  };
}

export function generateJsonGraph(topology: TopologyConfig): JsonGraph {
  const nodes: GraphNode[] = topology.nodes.map(node => ({
    id: node.id,
    module: node.module,
    params: node.params,
    runMode: node.runMode || 'inproc',
  }));

  const edges: GraphEdge[] = topology.connections.map(conn => ({
    from: conn.from,
    to: conn.to,
    type: conn.type || 'direct',
  }));

  return {
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function generateAsciiGraph(topology: TopologyConfig): string {
  const lines: string[] = [];
  const nodeMap = new Map<string, NodeConfig>();
  
  topology.nodes.forEach(node => nodeMap.set(node.id, node));
  
  lines.push('┌─────────────────────────────────────────┐');
  lines.push('│         Topology Graph                  │');
  lines.push('└─────────────────────────────────────────┘');
  lines.push('');
  
  lines.push('Nodes:');
  topology.nodes.forEach(node => {
    const runMode = node.runMode || 'inproc';
    const icon = runMode === 'worker' ? '⚙' : runMode === 'process' ? '⚡' : '○';
    lines.push(`  ${icon} ${node.id} [${node.module}]`);
    if (node.params && Object.keys(node.params).length > 0) {
      const params = JSON.stringify(node.params, null, 2)
        .split('\n')
        .map(line => '      ' + line)
        .join('\n');
      lines.push(params);
    }
  });
  
  lines.push('');
  lines.push('Connections:');
  
  const connectionsByNode = new Map<string, ConnectionConfig[]>();
  topology.connections.forEach(conn => {
    const fromNode = conn.from.split('.')[0];
    if (!connectionsByNode.has(fromNode)) {
      connectionsByNode.set(fromNode, []);
    }
    connectionsByNode.get(fromNode)!.push(conn);
  });
  
  topology.nodes.forEach(node => {
    const connections = connectionsByNode.get(node.id);
    if (connections && connections.length > 0) {
      connections.forEach(conn => {
        const arrow = conn.type === 'split' ? '═╤═>' : conn.type === 'merge' ? '═╧═>' : '───>';
        lines.push(`  ${conn.from} ${arrow} ${conn.to}`);
      });
    }
  });
  
  if (topology.connections.length === 0) {
    lines.push('  (no connections)');
  }
  
  lines.push('');
  lines.push(`Summary: ${topology.nodes.length} nodes, ${topology.connections.length} connections`);
  
  return lines.join('\n');
}
