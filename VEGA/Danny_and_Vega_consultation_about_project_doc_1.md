# Danny and Vega: Consultation About Project — Doc 1

Version: 1.0
Date Context: 2025-01-10 (conversation start)
Scope: Technical summary of the shared “Micro Kernel: Architecture Vision” without recommendations

## Executive Summary

The project is a microkernel-based system for capturing, transforming, and rendering terminal I/O using a “pure plumbing” model: the kernel provides only pipes and service discovery; all semantics, protocols, and behaviors live in independently composable modules. While terminal I/O is the proving ground (PTY-first), the kernel is intended as a reusable, transport-agnostic foundation suitable for many projects. A parallel ecosystem of “GNU Hurd–like servers” (modules) supplies features without kernel changes.

Core idea: treat terminal I/O as streams of bytes flowing through standard Node.js Duplex streams; compose modules for parsing, routing, rendering, recording, input, and networking. The same session can feed multiple outputs and accept multiple inputs concurrently.

## Key Design Principles

- Minimal kernel: ~60 lines. Pipes + connect/split/merge + service registry.
- Maximum flexibility: semantics live in modules, not the kernel.
- Pure streams: standard Node.js Duplex with backpressure; no custom framing in core.
- Composability: arbitrary topologies from simple parts (fan-in/fan-out).
- Transport agnostic: serial, PTY, sockets, shared memory, etc.
- Start simple, scale complex: from VT100 replica to multi-modal systems.

## What Makes It Different

- Terminal as data-flow: raw byte streams, kernel as “physical layer”.
- Modules implement higher layers (framing, parsing, routing, congestion control, rendering).
- Multi-input (keyboard, voice, MCP, network) and multi-output (browser, MP4, TTS, Braille) compose naturally.
- Same session can be rendered in multiple modalities simultaneously.

## Design Philosophy

- Mach/microkernel analogy: mechanism (kernel plumbing) vs policy (modules).
- Seven-layer mapping: the kernel corresponds to “physical”; all upper-layer concerns are module territory (framing, error detection, transport, session, presentation, application).
- Kernel answers only: carrier exists, data can flow, provider discovery.
- Kernel explicitly does not define: data formats, congestion strategies, parsing, retries, domain semantics.

## Core Architecture

Kernel surface (conceptual):

- Pipe management: `createPipe()` returns a Duplex; `connect(from,to)` pipes streams.
- Stream operations: `split(source, [dests...])`, `merge([sources...], dest)`.
- Service registry: `register(name, capabilities, pipe)`, `lookup(query)`.

Pipes:

- A pipe is a standard Node.js Duplex (Readable+Writable) with built-in backpressure and `pipe()` composition.
- Optional debugging/metadata may be associated, but the fundamental contract is “just streams.”

Modules:

- Shape: `{ id, type: 'input'|'source'|'transform'|'output', init(), destroy(), inputPipe?, outputPipe? }`.
- Types:
  - Input: generates data (output only).
  - Source: interactive processes (PTY, Docker)—both input and output.
  - Transform: processes data (both input and output).
  - Output: consumes data (input only).

Service Registry & Capabilities:

- Registration includes capability descriptors: `accepts`, `produces`, `type`, optional `features`.
- Discovery via queries: filter by `accepts`, `produces`, `type`, and `features` to obtain pipes.
- Allows multiple providers for the same capability and dynamic selection.

## Canonical Data Flows (as described)

1. Minimal VT100 replica

- Keyboard → PTY → Screen (raw bytes end-to-end, no transforms).

2. Multi-input fan-in

- Keyboard + Voice + MCP → Merge → PTY → Screen.

3. Multi-output fan-out

- PTY → Parser → [Browser, MP4, TTS, Braille] (simultaneous renderings).

4. Dual-path (raw + parsed)

- PTY → Screen (raw, fast path)
- PTY → Parser → MP4 (structured, slower path)

5. Remote viewer (read-only)

- Remote PTY → Network → [Screen, TTS].

## Illustrative Module Sketches (as conveyed)

- KeyboardInput (input): reads from stdin (raw mode), writes bytes to an output pipe; registers `produces: ['raw-input']`.
- Local/Docker PTY (source): spawns a shell or container TTY; writes PTY output to `outputPipe`, consumes input from `inputPipe`; registers `accepts: ['raw-input'], produces: ['raw-ansi']` with `features: ['pty', ...]`.
- XtermParser (transform): consumes raw ANSI, produces structured terminal state (e.g., buffer, cursor, timestamp) for downstream consumers.
- MP4Recorder (output): consumes structured terminal state, renders frames to a canvas, and encodes with ffmpeg to MP4.

## Stated Design Principles (reiterated)

- Separation of concerns: kernel never contains protocol/semantic logic.
- Composability over features: add capabilities by composing modules, not by expanding core.
- Pay for what you use: zero-overhead fast paths when transforms aren’t present.
- Fail gracefully: module failures don’t bring down the topology; others continue.
- Testability first: modules testable in isolation; deterministic composition tests.
- Configuration over code: complex topologies representable declaratively (e.g., YAML).

## Comparisons (positioning)

- vs traditional terminal emulators: microkernel + modules vs monolith; easier extensibility, multi-output, built-in recording via modules.
- vs multiplexers (tmux/screen): data-flow pipeline vs session manager; independent multi-outputs and inputs.
- vs PTY wrappers (script/asciinema): full I/O pipeline, real-time multi-output, multiple input sources.
- vs container terminals (docker exec): adds multi-input, transforms, recording, and networked outputs via modules.

## Implementation Roadmap (phased)

Phase 1: core kernel + keyboard + local PTY + terminal output; config loader; basic tests; success = run bash interactively.

Phase 2: demonstrate composability: XtermParser, BrowserOutput (WebSocket), MP4Recorder; lifecycle and registry maturity; success = browser + MP4 simultaneously.

Phase 3: advanced inputs: Whisper voice input, MCP input; merge inputs; optional arbitration modules; success = commands from keyboard/voice/MCP feed same PTY.

Phase 4: Docker integration: DockerPTY; lifecycle, volumes, network; success = containerized interactive session.

Phase 5: more outputs: TTS, Braille, GIF, JSON stream; success = 5+ outputs concurrently.

Phase 6: browser extension: DevTools panel, native messaging to kernel, MCP tools; success = Claude Code in DevTools with control.

Phase 7: network modules: WebSocket transport, SSH session, viewer mode, auth; success = remote viewing/control.

Phase 8: advanced features: recording/replay, time-travel, config UI, marketplace concept, perf and docs; production readiness.

## Extensibility & Potential Modules (examples)

- Inputs: GameController, Gesture, Scripted, REST API, MIDI.
- Sources: KubernetesPod, VMSerial, QEMUMonitor, GDBSession, REPL.
- Transforms: ANSIStripper, MarkdownConverter, SyntaxHighlighter, Encryptor, Compressor, Translator, OCR.
- Outputs: Slack/Discord/Twitch/YouTube, S3Uploader, EmailDigest, DB Logger, Prometheus, Syslog.
- Transports: WebSocket, Unix socket, shared memory, serial, gRPC, QUIC, Bluetooth.

## Security Considerations (summarized)

- Isolation via modules; stronger isolation via processes/containers/threads when needed.
- Sandboxing sources (e.g., Docker security options).
- Input validation at boundaries (e.g., escape-sequence sanitization).
- Authentication for network modules (e.g., bearer tokens for WebSocket).

## Performance Characteristics (summarized)

- Zero-copy passthrough on direct pipe connections; fast human-scale latencies.
- Transform overhead applies only to paths that include them.
- Fan-out cost O(N) copies; acceptable for terminal frame rates.
- Backpressure via Node streams; slow consumers don’t block fast ones.

## Testing Strategy (summarized)

- Unit: module behavior in isolation (e.g., parser correctness).
- Integration: compositions (e.g., PTY → Parser → MP4).
- End-to-end: full multi-input/multi-output scenarios with validation of outputs and artifacts.

## Configuration Formats (summarized)

- Declarative YAML for topology (inputs, source, transforms, outputs, routing, settings).
- Programmatic configuration alternative for dynamic setups.

## Success Criteria (as stated)

- Kernel remains unchanged; new features achieved via modules and configuration.
- Modules are independently testable; complex behaviors emerge from simple compositions.
- Excellent performance on fast paths; minimal overhead for unused capabilities.
- Topologies are defined declaratively; supports use cases beyond initial terminal focus.
