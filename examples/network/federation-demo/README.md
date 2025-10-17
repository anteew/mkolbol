# Federation Demo

This example demonstrates router-to-router federation with static peer configuration, endpoint propagation, and automatic failover.

## Features

- **Two Routers** with static peer discovery (Router-1 ↔ Router-2)
- **Endpoint Propagation** - local announcements are shared across federation
- **Path Preference** - local endpoints preferred over remote (local > LAN > WAN)
- **Automatic Failover** - when local endpoint fails, traffic fails over to remote

## Architecture

```
┌─────────────┐                  ┌─────────────┐
│  Router-1   │◄────Federation───►│  Router-2   │
│             │                   │             │
│ Local:      │                   │ Local:      │
│ service-a   │                   │ service-a   │
│ service-b   │                   │ service-b   │
│             │                   │             │
│ Remote:     │                   │ Remote:     │
│ (from R2)   │                   │ (from R1)   │
└─────────────┘                   └─────────────┘
```

## Running the Demo

### Terminal 1 - Router-2 (Start first)

```bash
npx tsx examples/network/federation-demo/router2.ts
```

### Terminal 2 - Router-1

```bash
npx tsx examples/network/federation-demo/router1.ts
```

## What to Observe

1. **Federation Startup**
   - Each router discovers its peer via static configuration
   - Peer connections are established

2. **Endpoint Propagation**
   - Router-1 announces `service-a` and `service-b` locally
   - Router-2 announces `service-a` and `service-b` locally
   - Each router receives remote announcements from its peer

3. **Path Preference**
   - Each router sees multiple endpoints for the same coordinates
   - Local endpoints are marked as `[BEST]` in routing table
   - Remote endpoints are available as backups

4. **Automatic Failover** (after 15 seconds)
   - Router-1 withdraws its local `service-a`
   - Router-1 automatically fails over to Router-2's `service-a`
   - Best path updates from local → remote

## Expected Output

Router-1 will show:

```
[Router-1] Federation started
[Router-1] Peers: router-2

[Router-1/ADDED] r1-service-a (node:service-a) source=local
[Router-1/ADDED] r2-service-a (node:service-a) source=router-2

[Router-1] === Routing Table ===
  node:service-a <- r1-service-a (LOCAL) [BEST]
  node:service-a <- r2-service-a (router-2)

[Router-1] SIMULATING FAILURE: Withdrawing local service-a...
[Router-1/REMOVED] r1-service-a (node:service-a) source=local
[Router-1] FAILOVER: Best service-a is now r2-service-a (source=router-2)
```

## Configuration

- **TTL**: 10 seconds (endpoints expire if not refreshed)
- **Sweep Interval**: 3 seconds (stale endpoint cleanup)
- **Propagation Interval**: 2 seconds (federation sync)
- **Peer Discovery**: Static configuration (ConfigPeerSource)

## Key Concepts

### Federation

Routers share endpoint announcements with configured peers, creating a distributed routing table across the cluster.

### Path Preference

When multiple endpoints exist for the same coordinates:

1. **Local** endpoints (announced locally) are preferred
2. **Remote** endpoints (from peers) serve as backups

### Failover

When a preferred endpoint expires or is withdrawn, the router automatically selects the next best alternative based on path preference.

### TTL Propagation

Endpoints must be periodically re-announced to stay alive. When an endpoint stops being refreshed, it expires and is removed from the routing table, triggering failover to alternatives.
