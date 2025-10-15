interface ProcessControlAdapter {
    publish(topic: string, data: unknown): void;
    subscribe(topic: string, handler: (data: unknown) => void): () => void;
}
export declare class WorkerControlAdapter implements ProcessControlAdapter {
    private handlers;
    constructor();
    publish(topic: string, data: unknown): void;
    subscribe(topic: string, handler: (data: unknown) => void): () => void;
    private handleIncoming;
}
export {};
//# sourceMappingURL=WorkerControlAdapter.d.ts.map