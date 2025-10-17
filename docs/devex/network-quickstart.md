# Network Quickstart - Remote Streaming

This guide demonstrates cross-process streaming using TCP and WebSocket transports.

## Quick Demo: Remote Viewer

Run a timer source in one process and view output in another via TCP.

**Terminal 1 (Server):**

```bash
npm run build
npx tsx examples/network/remote-viewer/server.ts
```

**Terminal 2 (Client):**

```bash
npx tsx examples/network/remote-viewer/client.ts
```

You'll see messages flowing from server to client over TCP port 30018.

## Architecture

```
Process A (Server)          Process B (Client)
┌─────────────────┐        ┌─────────────────┐
│  TimerSource    │        │                 │
│       ↓         │        │                 │
│  TCPPipeServer  │────────│  TCPPipeClient  │
│  (port 30018)   │  TCP   │       ↓         │
└─────────────────┘        │   stdout        │
                           └─────────────────┘
```

## Frame Protocol

TCPPipe uses length-prefixed framing:

**Frame Structure:**

```
[4 bytes: metadata length][4 bytes: payload length][metadata JSON][payload]
```

**Frame Types:**

- `data` - Carries actual stream data
- `ping` - Keep-alive heartbeat
- `pong` - Heartbeat response
- `close` - Graceful shutdown signal

## Port Usage

Tests and examples use ephemeral ports **30010-30019** to avoid conflicts.

## Safety Features

- **Max payload**: 10MB per frame (prevents DOS)
- **Graceful shutdown**: Close frames signal termination
- **Ping/pong**: Automatic keep-alive
- **Error handling**: Connection failures handled gracefully

---

## WebSocket Streaming

WebSocketPipe provides the same streaming capabilities over WebSocket protocol.

### Quick Demo: WebSocket Smoke Test

**Terminal 1 (Server):**

```bash
npm run build
npx tsx examples/network/ws-smoke/server.ts
```

**Terminal 2 (Client):**

```bash
npx tsx examples/network/ws-smoke/client.ts
```

You'll see bidirectional message flow over WebSocket port 30015.

### WebSocket Architecture

```
Process A (Server)          Process B (Client)
┌─────────────────┐        ┌─────────────────┐
│  Data Source    │        │                 │
│       ↓         │        │                 │
│  WSPipeServer   │────────│  WSPipeClient   │
│  (port 30015)   │   WS   │       ↓         │
└─────────────────┘        │   Consumer      │
                           └─────────────────┘
```

### Protocol Compatibility

Both TCPPipe and WebSocketPipe use the same **FrameCodec** protocol:

- Length-prefixed frames
- Metadata + payload structure
- Ping/pong keep-alive
- Graceful close frames

This means switching between TCP and WebSocket requires only changing the Pipe type - no protocol changes.

### When to Use WebSocket vs TCP

**Use WebSocket when:**

- You need browser compatibility
- You want built-in HTTP upgrade handshake
- You're working through proxies/firewalls (port 80/443)

**Use TCP when:**

- You need lower overhead (no HTTP headers)
- You control both endpoints
- You want maximum performance

### API Comparison

```typescript
// TCP
import { TCPPipeClient, TCPPipeServer } from 'mkolbol/pipes/adapters/TCPPipe';
const server = new TCPPipeServer({ port: 30010 });
const client = new TCPPipeClient({ port: 30010 });

// WebSocket
import { WebSocketPipeClient, WebSocketPipeServer } from 'mkolbol/pipes/adapters/WebSocketPipe';
const server = new WebSocketPipeServer({ port: 30015 });
const client = new WebSocketPipeClient({ port: 30015 });
```

Both provide identical Duplex stream interfaces.

---

## Next Steps

- See [Remote Viewer README](../../examples/network/remote-viewer/README.md) for TCP example
- See [WebSocket Smoke README](../../examples/network/ws-smoke/README.md) for WebSocket example
- See [TCPPipe tests](../../tests/integration/tcpPipe.spec.ts) for TCP API usage
- See [WebSocketPipe tests](../../tests/integration/wsPipe.spec.ts) for WebSocket API usage
- See [FrameCodec tests](../../tests/net/frame.spec.ts) for protocol details
