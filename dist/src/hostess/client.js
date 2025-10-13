export function buildServerManifest(params) {
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
export function registerWithHostess(hostess, manifest) {
    return hostess.register(manifest);
}
export function startHeartbeat(hostess, serverId, intervalMs = 5000) {
    const timer = setInterval(() => hostess.heartbeat(serverId), intervalMs);
    return () => clearInterval(timer);
}
//# sourceMappingURL=client.js.map