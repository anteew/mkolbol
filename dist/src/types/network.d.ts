export interface PeerInfo {
    hostId: string;
    addr: string;
    proto: 'tcp' | 'ws';
    supportedVersions: number[];
    namespaces?: string[];
    caps?: string[];
    ttl?: number;
    discoveredAt?: number;
    lastSeen?: number;
}
export interface PeerApproval {
    hostId: string;
    approvedAt: number;
    approvedBy?: string;
}
//# sourceMappingURL=network.d.ts.map