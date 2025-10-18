/**
 * Connect command - attach to remote TCP or WebSocket pipes
 *
 * URL Format Contract (frozen as of P21):
 * - TCP:  tcp://HOST:PORT
 * - WebSocket: ws://HOST:PORT[/PATH]
 *
 * Examples:
 * - tcp://localhost:30010
 * - tcp://192.168.1.100:30018
 * - ws://localhost:30015
 * - ws://localhost:30015/pipe
 *
 * Constraints:
 * - HOST: Valid hostname or IPv4 address
 * - PORT: Integer 1-65535
 * - PATH: Optional for WebSocket, must start with /
 */
export interface ParsedURL {
    protocol: 'tcp' | 'ws';
    host: string;
    port: number;
    path?: string;
}
export interface ConnectOptions {
    url: string;
    json?: boolean;
    record?: string;
    replay?: string;
}
export declare class URLParseError extends Error {
    constructor(message: string);
}
/**
 * Parse and validate a connection URL
 *
 * @param url - The URL to parse (tcp://... or ws://...)
 * @returns Parsed URL components
 * @throws URLParseError if URL is invalid
 */
export declare function parseURL(url: string): ParsedURL;
/**
 * Get help text for connect command
 */
export declare function getConnectHelp(): string;
/**
 * Validate connect options
 *
 * @param options - Options to validate
 * @throws URLParseError if options are invalid
 */
export declare function validateConnectOptions(options: ConnectOptions): void;
//# sourceMappingURL=connect.d.ts.map