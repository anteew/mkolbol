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

## Router Federation with Static Peers

Router federation allows multiple routing servers to share endpoint announcements and provide automatic failover across a distributed cluster.

### Quick Demo: Two-Router Federation

This example demonstrates router-to-router federation with static peer configuration, endpoint propagation, and automatic failover.

**Terminal 1: Router-2 (Start first)**

```bash
npm run build
npx tsx examples/network/federation-demo/router2.ts
```

**Terminal 2: Router-1**

```bash
npx tsx examples/network/federation-demo/router1.ts
```

### What Happens

1. **Federation Startup**
   - Each router discovers its peer via static configuration
   - Router-1 peers with Router-2, and vice versa

2. **Endpoint Propagation**
   - Each router announces endpoints locally (`service-a`, `service-b`)
   - Federation propagates announcements to peer routers
   - Each router sees both local and remote endpoints

3. **Path Preference**
   - Local endpoints are preferred over remote endpoints
   - When multiple endpoints exist for same coordinates: local > LAN > WAN
   - Best path is marked in routing table

4. **Automatic Failover**
   - After 15 seconds, Router-1 withdraws its local `service-a`
   - Router-1 automatically fails over to Router-2's `service-a`
   - Traffic is rerouted seamlessly

### Architecture

```
┌─────────────┐                  ┌─────────────┐
│  Router-1   │◄────Federation───►│  Router-2   │
│             │    (Static Peers) │             │
│ Local:      │                   │ Local:      │
│ service-a   │                   │ service-a   │
│ service-b   │                   │ service-b   │
│             │                   │             │
│ Remote:     │                   │ Remote:     │
│ (from R2)   │                   │ (from R1)   │
└─────────────┘                   └─────────────┘
```

### Key Features

**ConfigPeerSource**: Static peer configuration

- Peers are configured explicitly (no mDNS required)
- Suitable for controlled environments (DC, K8s)
- Format: `tcp://router-id:port` or `ws://router-id:port`

**Path Preference**: Local > Remote routing

- Local endpoints always preferred
- Remote endpoints serve as backups
- Automatic selection of best available path

**TTL Propagation**: Liveness semantics across federation

- Endpoints must be periodically refreshed
- Stale endpoints are automatically removed
- `staleExpired` events trigger failover

**Eventual Consistency**: No strong ordering

- Federation uses eventual consistency model
- Announcements propagate asynchronously
- No distributed consensus required

### API Example

```typescript
import { RoutingServer } from 'mkolbol/router/RoutingServer';
import { Federation, ConfigPeerSource } from 'mkolbol/router/Federation';

// Create router
const router = new RoutingServer({ ttlMs: 10000 });

// Configure static peers
const peerSource = new ConfigPeerSource(['tcp://router-2:30020', 'tcp://router-3:30020']);

// Create federation
const federation = new Federation({
  routerId: 'router-1',
  router,
  peerSource,
  propagateIntervalMs: 2000,
});

// Start federation
await federation.start();

// Announce local endpoint
router.announce({
  id: 'service-a',
  type: 'inproc',
  coordinates: 'node:service-a',
});

// Resolve best endpoint (local > remote)
const best = router.resolve('node:service-a');

// Get all endpoints ranked by preference
const all = router.resolveAll('node:service-a');
```

### Monitoring Federation

```typescript
// Get federation status
const status = federation.getStatus();
console.log('Router ID:', status.routerId);
console.log('Peer count:', status.peerCount);
console.log('Local endpoints:', status.localEndpointCount);

// Subscribe to routing events
router.subscribe((event) => {
  console.log(event.type); // 'added', 'updated', 'removed', 'staleExpired'
  console.log(event.endpoint.id);
  console.log(event.endpoint.metadata?.federationSource); // peer router ID
});
```

### Running Acceptance Test

Automated acceptance test that verifies federation, propagation, and failover:

```bash
npx tsx examples/network/federation-demo/test.ts
```

This test programmatically:

- Sets up two routers with static peers
- Verifies peer discovery
- Announces endpoints and simulates cross-propagation
- Validates path preference (local > remote)
- Simulates link failure
- Verifies automatic failover

---

## Next Steps

- See [Remote Viewer README](../../examples/network/remote-viewer/README.md) for TCP example
- See [WebSocket Smoke README](../../examples/network/ws-smoke/README.md) for WebSocket example
- See [Federation Demo README](../../examples/network/federation-demo/README.md) for router federation
- See [TCPPipe tests](../../tests/integration/tcpPipe.spec.ts) for TCP API usage
- See [WebSocketPipe tests](../../tests/integration/wsPipe.spec.ts) for WebSocket API usage
- See [Federation tests](../../tests/integration/router.federation.spec.ts) for federation API usage
- See [Failover tests](../../tests/integration/router.failover.spec.ts) for path preference and failover
- See [FrameCodec tests](../../tests/net/frame.spec.ts) for protocol details
- See [mkctl Cookbook](./mkctl-cookbook.md#remote-viewing) for complete connect command reference
- See [Remote Host Setup](./remote-host-setup.md#ssh-tunnel-patterns-for-mkctl-connect) for SSH tunnel patterns
