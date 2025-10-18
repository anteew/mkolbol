# Serial Bridge Demo (transport‑agnostic)

This example shows how a “serial device” can participate in the OS‑Cloud without TCP/IP. We simulate a serial stream with a PassThrough for portability. Swap the shim with a real serial port (e.g., `serialport`) when running on hardware.

Topology (conceptual)

```
[Serial Device] ⇄ SerialAdapter ⇄ Kernel ⇄ Transform (uppercase) ⇄ ConsoleSink
```

Run

```
npx tsx examples/network/serial-bridge/serial-bridge.ts
```

Replace with real serial (later)

- Install a serial library and implement a small adapter that exposes a Node.js Duplex and plugs into the same glue used in this demo. The kernel doesn’t care — bytes are bytes.
