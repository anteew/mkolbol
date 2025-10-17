# WebSocket Pipe Smoke Test

Quick demonstration of WebSocketPipe bidirectional streaming.

## Run

**Terminal 1 (Server):**

```bash
npm run build
npx tsx examples/network/ws-smoke/server.ts
```

**Terminal 2 (Client):**

```bash
npx tsx examples/network/ws-smoke/client.ts
```

## What Happens

1. Server starts on port 30015
2. Client connects and sends 3 messages
3. Server echoes each message back with "Server echo:" prefix
4. Client receives and displays echoed messages
5. Client closes connection cleanly

## Architecture

```
┌─────────────────┐        ┌─────────────────┐
│  Client         │        │  Server         │
│                 │        │                 │
│  write() ───────┼────────┼──→ on('data')   │
│                 │  WS    │                 │
│  on('data') ←───┼────────┼─── write()      │
│                 │        │                 │
└─────────────────┘        └─────────────────┘
```

## Protocol

Uses FrameCodec (same as TCPPipe):

- Length-prefixed framing
- Metadata + payload structure
- Ping/pong keep-alive support
- Graceful close frames

## Ports

Smoke tests use **30012-30019** to avoid conflicts with other network tests.
