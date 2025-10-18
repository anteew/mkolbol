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

export class URLParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'URLParseError';
  }
}

/**
 * Parse and validate a connection URL
 *
 * @param url - The URL to parse (tcp://... or ws://...)
 * @returns Parsed URL components
 * @throws URLParseError if URL is invalid
 */
export function parseURL(url: string): ParsedURL {
  if (!url || typeof url !== 'string') {
    throw new URLParseError('URL must be a non-empty string');
  }

  // Check for known unsupported protocols first
  if (url.startsWith('http://') || url.startsWith('https://')) {
    throw new URLParseError(`HTTP/HTTPS not supported. Use ws:// for WebSocket or tcp:// for TCP`);
  }

  // Check if URL has a protocol
  if (!url.includes('://')) {
    throw new URLParseError(
      `Invalid URL format. Expected tcp://HOST:PORT or ws://HOST:PORT[/PATH]`,
    );
  }

  const proto = url.split('://')[0];

  // Check for TCP protocol
  if (proto === 'tcp') {
    const tcpMatch = url.match(/^tcp:\/\/([^:]+):(\d+)$/);
    if (!tcpMatch) {
      throw new URLParseError(`Invalid URL format. Expected tcp://HOST:PORT`);
    }

    const host = tcpMatch[1];
    const portStr = tcpMatch[2];
    const port = Number.parseInt(portStr, 10);

    if (Number.isNaN(port)) {
      throw new URLParseError(`Invalid port number: ${portStr}`);
    }

    if (port <= 0 || port > 65535) {
      throw new URLParseError(`Port must be between 1 and 65535, got: ${port}`);
    }

    if (!isValidHost(host)) {
      throw new URLParseError(`Invalid hostname: ${host}`);
    }

    return { protocol: 'tcp', host, port };
  }

  // Check for WebSocket protocol
  if (proto === 'ws') {
    const wsMatch = url.match(/^ws:\/\/([^:]+):(\d+)(\/.*)?$/);
    if (!wsMatch) {
      throw new URLParseError(`Invalid URL format. Expected ws://HOST:PORT[/PATH]`);
    }

    const host = wsMatch[1];
    const portStr = wsMatch[2];
    const path = wsMatch[3];
    const port = Number.parseInt(portStr, 10);

    if (Number.isNaN(port)) {
      throw new URLParseError(`Invalid port number: ${portStr}`);
    }

    if (port <= 0 || port > 65535) {
      throw new URLParseError(`Port must be between 1 and 65535, got: ${port}`);
    }

    if (!isValidHost(host)) {
      throw new URLParseError(`Invalid hostname: ${host}`);
    }

    return {
      protocol: 'ws',
      host,
      port,
      path: path || undefined,
    };
  }

  // Unknown protocol
  throw new URLParseError(`Unsupported protocol: ${proto}. Supported protocols: tcp://, ws://`);
}

/**
 * Validate hostname or IP address
 *
 * Accepts:
 * - localhost
 * - Hostnames (alphanumeric + hyphens)
 * - IPv4 addresses
 *
 * Does NOT validate:
 * - IPv6 (not supported in v1)
 * - Internationalized domain names
 */
function isValidHost(host: string): boolean {
  if (!host || host.length === 0) {
    return false;
  }

  // Allow localhost
  if (host === 'localhost') {
    return true;
  }

  // Check for IPv4 address
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = host.match(ipv4Regex);
  if (ipv4Match) {
    // Validate each octet is 0-255
    for (let i = 1; i <= 4; i++) {
      const octet = Number.parseInt(ipv4Match[i], 10);
      if (octet < 0 || octet > 255) {
        return false;
      }
    }
    return true;
  }

  // Check for valid hostname (RFC 1123)
  // - Labels separated by dots
  // - Each label: alphanumeric + hyphens, cannot start/end with hyphen
  // - Each label: 1-63 chars
  // - Total: max 253 chars
  if (host.length > 253) {
    return false;
  }

  const labels = host.split('.');
  const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

  for (const label of labels) {
    if (!labelRegex.test(label)) {
      return false;
    }
  }

  return labels.length > 0;
}

/**
 * Get help text for connect command
 */
export function getConnectHelp(): string {
  return `
Usage: mkctl connect --url <URL> [options]

Connect to a remote TCP or WebSocket pipe and view output.

Options:
  --url <URL>       Connection URL (required)
                    TCP format:  tcp://HOST:PORT
                    WS format:   ws://HOST:PORT[/PATH]
  --json            Output raw frames as JSON (default: human-readable)
  --record <PATH>   Save frames to file for later replay
  --replay <PATH>   Replay frames from file (ignores --url)

Examples:
  # Connect to local TCP pipe
  mkctl connect --url tcp://localhost:30010

  # Connect to remote TCP pipe
  mkctl connect --url tcp://192.168.1.100:30018

  # Connect to WebSocket pipe
  mkctl connect --url ws://localhost:30015/pipe

  # JSON output for tooling
  mkctl connect --url tcp://localhost:30010 --json

  # Record session to file
  mkctl connect --url tcp://localhost:30010 --record session.mkframes

  # Replay recorded session
  mkctl connect --replay session.mkframes

  # Replay in JSON mode
  mkctl connect --replay session.mkframes --json

URL Contract:
  HOST: localhost, hostname, or IPv4 address
  PORT: Integer between 1 and 65535
  PATH: Optional for WebSocket, must start with /

Supported Protocols:
  tcp://  - Raw TCP connection with frame protocol
  ws://   - WebSocket connection with frame protocol

Recording Format:
  Frames are saved in JSONL format (one frame per line)
  Each line contains: {type, timestamp, payload, sequenceId}

For remote connections, use SSH tunneling for security:
  ssh -L 30010:localhost:30010 user@remote-host

See: docs/devex/mkctl-cookbook.md#remote-viewing
`.trim();
}

/**
 * Validate connect options
 *
 * @param options - Options to validate
 * @throws URLParseError if options are invalid
 */
export function validateConnectOptions(options: ConnectOptions): void {
  // Replay mode doesn't require URL
  if (options.replay) {
    return;
  }

  if (!options.url) {
    throw new URLParseError('--url is required (unless using --replay)');
  }

  // Parse URL to validate format
  parseURL(options.url);

  // Cannot use both record and replay
  if (options.record && options.replay) {
    throw new URLParseError('Cannot use both --record and --replay');
  }
}
