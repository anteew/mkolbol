# Near-Term and Future Plan (VEGA)

Version: 2025-10-12
Owner: VEGA

## Near Term (next 1–2 sessions)

1) Worker-mode + Adapters (Phase 1)
- Add ControlBusAdapter + PipeAdapter interfaces
- Implement worker-backed adapters (MessagePort) for control + data pipes
- Executor runMode 'worker' (spawn worker, transfer ports, handshake)
- Demo: mixed inproc + worker servers under same wiring

2) Hostess Control Endpoints
- Include control endpoint metadata (type + coordinates) in Hostess registration
- E.g., { control: { kind: 'worker-port'|'unix'|'tcp'|'nats'|'mqtt'|'inproc', coord: '…', topicPrefix?: '…' } }

3) Examples + Docs
- Update example config to use runMode (inproc + worker)
- Brief doc: control envelope, topics, endpoints, adapters
- Verify npm scripts (dev:control-bus, executor demos)

## Next (following sessions)

4) Process-mode (Phase 2)
- Unix/TCP adapters for control + pipes
- Executor runMode 'process' with restart policy and blue/green cutover
- Demo: zero-downtime swap from v1→v2

5) Broker Adapter (optional)
- NATS adapter for ControlBus (subjects, request/reply), toggle via config
- Preserve current inproc default for demos

## Future / Parking Lot

- Mux transform (N→1, setActive) for tmux-like switching without rewiring
- Router + gossip announcements (multi-hop envelopes, hop counts)
- LLDP/probe/beacon servers (connectivity knowledge)
- Pipe Meter transform (flow/latency counters) with metrics topics
- Golden transcript tests for demos
- Serial/TCP bridge server; VPN overlay experiment
- Process isolation hardening; worker harness pattern

## State of Mind Snapshot

- Keep kernel inert and tiny; invest in adapters and controllers.
- Prefer message boundaries over direct calls; stable envelopes, swappable transports.
- Demos that feel like physical plumbing: tee, cutover, mux.
