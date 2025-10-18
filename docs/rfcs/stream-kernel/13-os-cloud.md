# Tiny Operating System Cloud (OS‑Cloud)

Plain‑English idea

- mkolbol lets you build a tiny operating‑system‑shaped “cloud” out of many small servers. They can run in the same process, other processes, other machines, or even tiny boards (Arduino, etc.).
- The kernel is only the plumbing: it connects byte streams and helps components find each other. Everything else lives in swappable modules/servers.

Why you should care

- Mix and match: Put parts wherever they run best. A speech‑to‑text server on a GPU box, a serial device driver on a Raspberry Pi, a metrics sink in a container, a CI helper on a VM.
- Cross any boundary: process boundaries, machine boundaries, network boundaries, even “no TCP/IP” boundaries (serial, USB, Unix sockets, CAN bus, BLE, etc.). If it can move bytes, it can join.
- Grow gradually: Start on one machine, then spread to others with zero kernel changes.

What “doesn’t matter” (by design)

- Host OS: Linux, macOS, Windows, embedded — fine.
- Transport: TCP/WebSocket/Unix socket/serial/USB/shared memory — fine.
- Language/runtime: Node, Go, Rust, C, Arduino C++ — fine. Wrap it and speak bytes.

How it works at a glance

1. The kernel provides pipes and a simple registry. No business logic.
2. Servers (aka modules) do the work. They read/write bytes on pipes and advertise capabilities.
3. You compose N inputs → K transforms → M outputs, locally or remotely.

Example topologies

- Local dev: keyboard → PTY → terminal UI + JSON logger
- Mixed boundary: browser keyboard → WS → remote PTY → split: (screen, MP4 recorder, TTS)
- Serial device: sensor → serial → adapter → kernel → rules engine → alert output
- Arduino: Arduino firmware ↔ serial ↔ adapter ↔ kernel ↔ browser dashboard

Operational mindset

- Think “the Borg foundation”: add a node/device/server anywhere; it participates if it can push/pull bytes and register capabilities.
- Don’t push app logic into the kernel; keep it in servers so it’s easy to move/replace/scale.

FAQ (noob‑friendly)

- “Do I need Docker/Kubernetes?” No. You can, but any process will do.
- “Do I need TCP/IP?” No. Serial/USB/Unix sockets work too.
- “What language must my server use?” Any. Just connect via a transport and speak streams.
- “Can I run part of it on a firewall or switch someday?” Yes — the architecture welcomes that.
