# Remote Viewer Example

Demonstrates TCP-based remote streaming using TCPPipe adapter.

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

## Running

**Terminal 1 (Server):**
```bash
npm run build
npx tsx examples/network/remote-viewer/server.ts
```

**Terminal 2 (Client):**
```bash
npx tsx examples/network/remote-viewer/client.ts
```

**Expected Output (Client):**
```
[Client] Connecting to server on port 30018...
[Client] Connected! Receiving data:

[Client] Server message
[Client] Server message
[Client] Server message
...
```

Press Ctrl+C in either terminal to stop.

## Features Demonstrated

- **Cross-process streaming** - Data flows over TCP between processes
- **Frame-based protocol** - Length-prefixed frames with metadata
- **Bidirectional communication** - Both client and server can send/receive
- **Graceful shutdown** - Clean connection termination
- **Ping/pong keep-alive** - Automatic heartbeat (handled by codec)

## Port Usage

Uses ephemeral port **30018** (range 30010-30019) to avoid collisions.
