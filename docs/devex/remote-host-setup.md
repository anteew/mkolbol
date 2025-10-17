# Remote Host Setup - Quick Start

This guide shows you how to set up mkolbol on a second machine for distributed streaming.

## Use Cases

- **Distributed data collection**: Run data sources on edge devices, stream to central server
- **Remote monitoring**: Monitor remote processes and stream logs back to local machine
- **Load distribution**: Split processing across multiple machines
- **Network testing**: Test TCP/WebSocket streaming across real network boundaries

---

## Prerequisites

### Both Machines

- Node.js 20+ or 24+
- Network connectivity between machines
- Firewall rules allowing chosen ports (30010-30019 for examples)

### Distribution Method

Choose one method to install mkolbol on the remote host:

1. **Tarball** (recommended for production) - Reproducible, offline-capable
2. **Git Tag** - Version-controlled, requires network
3. **Git Clone** - Development, full source access

See [Installation Guide](./installation.md) for detailed instructions on each method.

---

## Quick Setup: TCP Streaming

This is the fastest way to get cross-machine streaming working.

### Step 1: Set Up Remote Host (Server)

On your **remote machine** (e.g., a Raspberry Pi, cloud VM, or second laptop):

```bash
# Install mkolbol
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm ci
npm run build

# Create and run a simple server
npx tsx examples/network/remote-viewer/server.ts
```

**Expected output:**

```
Starting timer on TCP server (port 30018)...
Server listening on port 30018
```

The server is now streaming timer messages and waiting for connections.

### Step 2: Connect from Local Machine (Client)

On your **local machine**:

```bash
# Install mkolbol (if not already)
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm ci
npm run build

# Edit examples/network/remote-viewer/client.ts
# Change localhost to your remote machine's IP:
# const client = new TCPPipeClient({ port: 30018, host: '192.168.1.100' });

# Run client
npx tsx examples/network/remote-viewer/client.ts
```

**Expected output:**

```
Connecting to 192.168.1.100:30018...
Connected! Receiving data...
[Tue Oct 17 2025 12:34:56] tick
[Tue Oct 17 2025 12:34:57] tick
[Tue Oct 17 2025 12:34:58] tick
```

You're now streaming data from the remote machine to your local machine over TCP!

---

## Quick Setup: WebSocket Streaming

WebSocket provides browser compatibility and works better through proxies/firewalls.

### Step 1: Set Up Remote Host (WebSocket Server)

On your **remote machine**:

```bash
cd mkolbol
npx tsx examples/network/ws-smoke/server.ts
```

**Expected output:**

```
Starting WebSocket server on port 30015...
WebSocket server listening. Press Ctrl+C to stop.
```

### Step 2: Connect from Local Machine (WebSocket Client)

On your **local machine**:

```bash
# Edit examples/network/ws-smoke/client.ts
# Change localhost to your remote machine's IP:
# const client = new WebSocketPipeClient({ port: 30015, host: '192.168.1.100' });

npx tsx examples/network/ws-smoke/client.ts
```

**Expected output:**

```
Connecting to WebSocket server on 192.168.1.100:30015...
Connected!
[Client received]: Server echo: Hello from client!
[Client received]: Server echo: This is a test message
[Client received]: Server echo: WebSocket streaming works!
Closing connection...
```

---

## Production Patterns

### Pattern 1: Remote Data Source → Local Storage

Run a data source (e.g., sensor readings, logs) on a remote machine and stream to local storage.

**Remote machine (sensor.ts):**

```typescript
import { TCPPipeServer } from './src/pipes/adapters/TCPPipe.js';
import { Readable } from 'stream';

const server = new TCPPipeServer({ port: 30010 });

const sensorStream = new Readable({
  read() {
    const reading = {
      timestamp: new Date().toISOString(),
      temperature: (Math.random() * 30 + 10).toFixed(2),
      humidity: (Math.random() * 40 + 40).toFixed(2),
    };
    this.push(JSON.stringify(reading) + '\n');
  },
});

await server.listen((client) => {
  console.log('Client connected');
  sensorStream.pipe(client);
});

console.log('Sensor server running on port 30010');
```

**Local machine (collector.ts):**

```typescript
import { TCPPipeClient } from './src/pipes/adapters/TCPPipe.js';
import * as fs from 'fs';

const client = new TCPPipeClient({ port: 30010, host: 'sensor-pi.local' });
await client.connect();

const logFile = fs.createWriteStream('sensor-data.jsonl', { flags: 'a' });
client.pipe(logFile);

console.log('Collecting sensor data...');
```

### Pattern 2: Remote Logs → Local Monitoring

Stream application logs from a remote server to local monitoring/analysis.

**Remote machine (app-server.ts):**

```typescript
import { WebSocketPipeServer } from './src/pipes/adapters/WebSocketPipe.js';
import { spawn } from 'child_process';

const server = new WebSocketPipeServer({ port: 30015 });

await server.listen((client) => {
  console.log('Monitor connected');

  // Stream application logs
  const app = spawn('node', ['my-app.js']);
  app.stdout.pipe(client);
  app.stderr.pipe(client);
});

console.log('Log server ready on port 30015');
```

**Local machine (monitor.ts):**

```typescript
import { WebSocketPipeClient } from './src/pipes/adapters/WebSocketPipe.js';

const client = new WebSocketPipeClient({
  port: 30015,
  host: 'prod-server.example.com',
});

await client.connect();

client.on('data', (chunk) => {
  console.log('[REMOTE]', chunk.toString());
});
```

---

## Network Configuration

### Firewall Rules

Allow inbound connections on your chosen port:

**Linux (ufw):**

```bash
sudo ufw allow 30015/tcp comment "mkolbol WebSocket"
sudo ufw allow 30018/tcp comment "mkolbol TCP streaming"
```

**Linux (iptables):**

```bash
sudo iptables -A INPUT -p tcp --dport 30015 -j ACCEPT
sudo iptables-save
```

**macOS:**

```bash
# Add rule in System Settings → Network → Firewall → Options
# Or use command line:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /path/to/node
```

**Windows:**

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "mkolbol TCP" -Direction Inbound -LocalPort 30018 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "mkolbol WebSocket" -Direction Inbound -LocalPort 30015 -Protocol TCP -Action Allow
```

### Finding Your Remote Machine IP

**On remote machine:**

```bash
# Linux/macOS
ip addr show  # or ifconfig
hostname -I

# Windows
ipconfig
```

Look for your local network address (usually 192.168.x.x or 10.x.x.x).

### Port Selection

**Reserved ports for mkolbol examples:**

- 30010-30019: Test and example use
- 30020+: Available for your applications

**Best practices:**

- Use high ports (30000+) to avoid conflicts with system services
- Document port assignments in your team
- Use environment variables for port configuration

---

## Troubleshooting

### Connection Refused

**Symptom:**

```
Error: connect ECONNREFUSED 192.168.1.100:30015
```

**Fixes:**

1. Verify server is running on remote machine
2. Check firewall allows the port
3. Verify IP address is correct: `ping 192.168.1.100`
4. Ensure port matches between client and server

### Connection Timeout

**Symptom:**

```
Error: Connection timeout
```

**Fixes:**

1. Check network connectivity: `ping remote-host`
2. Verify no intermediate firewall blocking traffic
3. Try telnet to test port: `telnet 192.168.1.100 30015`
4. Increase timeout in client: `{ timeout: 10000 }`

### Server Won't Start

**Symptom:**

```
Error: listen EADDRINUSE: address already in use :::30015
```

**Fixes:**

1. Port already in use - choose different port
2. Kill existing process: `lsof -i :30015` then `kill <PID>`
3. Wait a few seconds for OS to release port

### Data Not Flowing

**Symptom:** Client connects but no data appears

**Fixes:**

1. Verify server is actually sending data (add console.log)
2. Check client is reading: `client.on('data', (chunk) => console.log(chunk))`
3. Ensure pipes are connected correctly
4. Check for backpressure issues (add drain handlers)

---

## Security Considerations

### Authentication

The current implementation has **no authentication**. Anyone who can reach the port can connect.

**Production mitigations:**

- Use SSH tunneling for secure transport
- Deploy behind VPN (Tailscale, WireGuard)
- Implement application-level auth (bearer tokens, mTLS)
- Use firewall to restrict source IPs

### Encryption

TCP and WebSocket pipes use **unencrypted** connections.

**Production mitigations:**

- Use SSH tunnel: `ssh -L 30015:localhost:30015 remote-host`
- Deploy WebSocket with TLS (wss://)
- Use VPN for all inter-machine traffic
- Consider stunnel or socat for TLS wrapping

### Example: SSH Tunnel

Instead of exposing ports, tunnel through SSH:

**Set up tunnel:**

```bash
# Forward local port 30015 to remote machine's 30015
ssh -L 30015:localhost:30015 user@remote-host
```

**Connect client to localhost:**

```typescript
// Client connects to localhost, but actually hits remote via tunnel
const client = new TCPPipeClient({ port: 30015, host: 'localhost' });
```

---

## SSH Tunnel Patterns for mkctl connect

Use SSH tunnels to securely view remote pipes without exposing additional ports.

### Basic TCP Tunnel

Forward a remote TCP pipe to your local machine:

```bash
# Terminal 1: Create SSH tunnel
# Forwards localhost:30010 → remote-host:30010
ssh -L 30010:localhost:30010 user@remote-host

# Terminal 2: Connect to the tunneled port
mkctl connect --url tcp://localhost:30010
```

**What happens:**

- SSH creates encrypted tunnel from your local port 30010 to remote port 30010
- `mkctl connect` connects to localhost:30010, but traffic flows to remote host
- All data is encrypted by SSH
- No firewall changes needed (uses existing SSH port 22)

### WebSocket Tunnel

Forward a remote WebSocket pipe:

```bash
# Terminal 1: Create SSH tunnel for WebSocket
ssh -L 30012:localhost:30012 user@remote-host

# Terminal 2: Connect to the tunneled WebSocket
mkctl connect --url ws://localhost:30012/pipe
```

### Multiple Port Tunneling

Forward multiple pipes simultaneously:

```bash
# Forward 3 different services in one SSH session
ssh -L 30010:localhost:30010 \
    -L 30011:localhost:30011 \
    -L 30012:localhost:30012 \
    user@remote-host

# Then connect to each in separate terminals
# Terminal 1
mkctl connect --url tcp://localhost:30010

# Terminal 2
mkctl connect --url tcp://localhost:30011

# Terminal 3
mkctl connect --url ws://localhost:30012/pipe
```

### Reverse Tunnel (Remote to Local)

Make your local pipe accessible from remote machine:

```bash
# On local machine: Create reverse tunnel
# Makes remote-host:30010 forward to localhost:30010
ssh -R 30010:localhost:30010 user@remote-host

# On remote machine: Connect to the reverse-tunneled port
mkctl connect --url tcp://localhost:30010
```

**Use case:** Development environment where you want to test from remote but pipe server runs locally.

### SSH Tunnel Best Practices

**Keep tunnel alive with autossh:**

```bash
# Install autossh
sudo apt-get install autossh

# Create persistent tunnel
autossh -M 0 -f -N -L 30010:localhost:30010 user@remote-host
```

**SSH config for easier tunneling:**

Add to `~/.ssh/config`:

```
Host remote-pipes
    HostName remote-host.example.com
    User your-username
    LocalForward 30010 localhost:30010
    LocalForward 30011 localhost:30011
    LocalForward 30012 localhost:30012
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then simply run:

```bash
# Single command to set up all tunnels
ssh -N remote-pipes
```

**Background tunnel:**

```bash
# Run tunnel in background
ssh -fN -L 30010:localhost:30010 user@remote-host

# Find and kill the tunnel later
ps aux | grep "ssh.*30010"
kill <PID>
```

### Security Notes

**Why SSH tunnels are recommended:**

- ✅ **Encryption**: All traffic encrypted with SSH (no plaintext on network)
- ✅ **Authentication**: Uses your existing SSH keys/passwords
- ✅ **No new firewall rules**: Only requires SSH port (22) to be open
- ✅ **Audit trail**: SSH logs all connections
- ✅ **Port protection**: Prevents unauthorized access to pipe ports

**Alternatives (less secure):**

- Direct TCP/WebSocket: Fast but unencrypted, requires firewall rules
- VPN: Secure but requires VPN setup and overhead
- TLS wrapping: Requires certificate management

**Recommended approach:** Always use SSH tunnels for remote pipe viewing in production.

---

## Advanced: Multi-Host Topology

Run a distributed topology across 3 machines:

**Machine A (data source):**

```bash
# Run timer source, stream to B
npx tsx producer.ts  # sends to machine-b:30010
```

**Machine B (transform):**

```bash
# Receive from A, transform, send to C
npx tsx transformer.ts  # receives from :30010, sends to machine-c:30011
```

**Machine C (sink):**

```bash
# Receive from B, store to disk
npx tsx collector.ts  # receives from :30011, writes to file
```

This creates a 3-hop pipeline across the network!

---

## Next Steps

- **[Network Quickstart](./network-quickstart.md)** - TCP and WebSocket API details
- **[Installation Guide](./installation.md)** - Distribution methods for remote hosts
- **[mkctl Cookbook](./mkctl-cookbook.md)** - Future remote mkctl connectivity
- **[Troubleshooting](./troubleshooting.md)** - General debugging tips
