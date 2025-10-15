interface ProcessControlAdapter {
    publish(topic: string, data: unknown): void;
    subscribe(topic: string, handler: (data: unknown) => void): () => void;
}
export declare class UnixControlAdapter implements ProcessControlAdapter {
    private handlers;
    private socket?;
    private server?;
    private heartbeatInterval?;
    private readonly socketPath;
    private readonly isServer;
    private closed;
    constructor(socketPath: string, isServer: boolean);
    private startServer;
    private connectClient;
    private setupSocket;
    private startHeartbeat;
    publish(topic: string, data: unknown): void;
    subscribe(topic: string, handler: (data: unknown) => void): () => void;
    private handleIncoming;
    shutdown(): void;
    close(): void;
}
export {};
//# sourceMappingURL=UnixControlAdapter.d.ts.map