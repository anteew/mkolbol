# Network Quickstart - TCP Remote Streaming

This guide demonstrates cross-process streaming using TCP transport.

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

## Next Steps

- See [Remote Viewer README](../../examples/network/remote-viewer/README.md) for detailed example
- See [TCPPipe tests](../../tests/integration/tcpPipe.spec.ts) for API usage
- See [FrameCodec tests](../../tests/net/frame.spec.ts) for protocol details
