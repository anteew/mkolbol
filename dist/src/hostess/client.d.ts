import { Hostess } from './Hostess.js';
import { ServerManifest, Terminal, ServiceCapabilities } from '../types.js';
export declare function buildServerManifest(params: {
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
}): ServerManifest;
export declare function registerWithHostess(hostess: Hostess, manifest: ServerManifest): string;
export declare function startHeartbeat(hostess: Hostess, serverId: string, intervalMs?: number): () => void;
//# sourceMappingURL=client.d.ts.map