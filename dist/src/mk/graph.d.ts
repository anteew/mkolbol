import type { TopologyConfig } from '../config/schema.js';
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
export declare function generateJsonGraph(topology: TopologyConfig): JsonGraph;
export declare function generateAsciiGraph(topology: TopologyConfig): string;
//# sourceMappingURL=graph.d.ts.map