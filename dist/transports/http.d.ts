import http from "node:http";
import { Router } from "../kernel/router";
import { McpNotification } from "../types";
type Client = {
    id: string;
    res: http.ServerResponse;
};
export declare class SSEHub {
    private clients;
    add(client: Client): void;
    remove(id: string): void;
    broadcast(note: McpNotification): void;
    heartbeat(): void;
}
export declare function startHttp(router: Router, port: number, sse: SSEHub): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export {};
//# sourceMappingURL=http.d.ts.map