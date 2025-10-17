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

---

## Viewing Remote Pipes with mkctl connect

The `mkctl connect` command provides an easy way to view output from remote TCP or WebSocket pipes.

### Quick Start: Connect to Local Pipe

**Terminal 1: Start a pipe server**

```bash
npm run build
npx tsx examples/network/remote-viewer/server.ts
```

**Terminal 2: View with mkctl connect**

```bash
# Human-readable output
mkctl connect --url tcp://localhost:30018

# JSON output (for tooling)
mkctl connect --url tcp://localhost:30018 --json
```

### Connect to Remote Pipe

Connect to a pipe running on a different machine:

```bash
# Direct connection (if firewall allows)
mkctl connect --url tcp://192.168.1.100:30018

# Via SSH tunnel (recommended for security)
# Terminal 1: Create tunnel
ssh -L 30018:localhost:30018 user@remote-host

# Terminal 2: Connect through tunnel
mkctl connect --url tcp://localhost:30018
```

### Output Modes

**Human-readable (default):**

```bash
mkctl connect --url tcp://localhost:30018
```

Output:

```
Connected to tcp://localhost:30018
[Tue Oct 17 2025 12:34:56] tick
[Tue Oct 17 2025 12:34:57] tick
```

**JSON mode (for automation):**

```bash
mkctl connect --url tcp://localhost:30018 --json
```

Output:

```json
{"type":"data","payload":"tick","timestamp":1697520905123}
{"type":"data","payload":"tick","timestamp":1697520906123}
{"type":"ping","timestamp":1697520910000}
```

**Pipe JSON to jq:**

```bash
mkctl connect --url tcp://localhost:30018 --json | jq 'select(.type=="data") | .payload'
```

### WebSocket Pipes

Connect works with WebSocket pipes too:

```bash
# Start WebSocket server
npx tsx examples/network/ws-smoke/server.ts

# Connect with mkctl
mkctl connect --url ws://localhost:30015

# JSON output
mkctl connect --url ws://localhost:30015 --json
```

### End-to-End Example

**Scenario:** Monitor remote server logs in real-time.

**Step 1: On remote server (192.168.1.100)**

Create a topology that exports logs via TCP:

```yaml
# http-logs-tcp.yml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        [
          '-e',
          'require("http").createServer((req,res)=>{console.log(req.url);res.end("OK")}).listen(3000)',
        ]
      ioMode: stdio
  - id: tcp-export
    module: TCPPipeServer
    params:
      port: 30018

connections:
  - from: web.output
    to: tcp-export.input
```

Start the topology:

```bash
mkctl run --file http-logs-tcp.yml --duration 3600
```

**Step 2: On local machine**

Set up SSH tunnel:

```bash
ssh -L 30018:localhost:30018 user@192.168.1.100
```

**Step 3: View logs**

```bash
mkctl connect --url tcp://localhost:30018
```

**Step 4: Generate traffic (optional)**

```bash
# On remote server or from anywhere
curl http://192.168.1.100:3000/hello
curl http://192.168.1.100:3000/api/users
```

You'll see the logs appear in your local terminal in real-time!

---

## Next Steps

- See [Remote Viewer README](../../examples/network/remote-viewer/README.md) for TCP example
- See [WebSocket Smoke README](../../examples/network/ws-smoke/README.md) for WebSocket example
- See [TCPPipe tests](../../tests/integration/tcpPipe.spec.ts) for TCP API usage
- See [WebSocketPipe tests](../../tests/integration/wsPipe.spec.ts) for WebSocket API usage
- See [FrameCodec tests](../../tests/net/frame.spec.ts) for protocol details
- See [mkctl Cookbook](./mkctl-cookbook.md#remote-viewing) for complete connect command reference
- See [Remote Host Setup](./remote-host-setup.md#ssh-tunnel-patterns-for-mkctl-connect) for SSH tunnel patterns
