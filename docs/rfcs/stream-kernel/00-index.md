# Stream Kernel RFC - Table of Contents

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** October 11, 2025

## Overview

This RFC proposes a minimal stream-based microkernel architecture (~100 lines) for building flexible, distributed terminal rendering and AI agent communication systems. The kernel provides protocol-agnostic "physical layer" plumbing, while all semantics live in composable modules.

## Documents

### Core Design

- **[01 - Philosophy](01-philosophy.md)** - Design principles, microkernel vs monolithic, mechanism vs policy
- **[02 - Core Architecture](02-core-architecture.md)** - The ~100 line kernel API: createPipe, connect, split, merge, registry
- **[03 - Module Types](03-module-types.md)** - Input, Source, Transform, Output, and Routing module patterns

### Use Cases & Applications

- **[04 - PTY Use Cases](04-pty-use-cases.md)** - Terminal I/O hijacking, multi-modal rendering, AI integration
- **[05 - Deployment Flexibility](05-deployment-flexibility.md)** - Single process → multi-process → distributed deployment
- **[06 - Distributed Service Mesh](06-distributed-service-mesh.md)** - Routing servers, terminals, multi-hop routing, hairpin flows

### Supporting Systems

- **[07 - StateManager/ControlPlane](07-state-manager.md)** - HMI control room for topology tracking, wiring configs, runtime introspection/control
- **[08 - Registry Server (The Hostess)](08-registry-server.md)** - Server registry, guest book, naming convention, reservations interface, executor/probe/beacon connection testing, LLDP-inspired discovery, information mesh
- **[09 - Roadmap](09-roadmap.md)** - Implementation phases and timeline
- **[10 - Executor Server](10-executor-server.md)** - Service lifecycle management, startup configuration, probe spawning for connection testing, external process management
- **[11 - External Server Wrapper](11-external-wrapper.md)** - Wrapping external executables (npm packages, C programs, binaries) as first-class mkolbol servers
- **[12 - PTY Wrapper Patterns](12-pty-wrapper-patterns.md)** - Wrapping interactive TUI applications with multi-modal rendering and multi-source input

### Philosophy in Practice

- **[13 - Tiny Operating System Cloud](13-os-cloud.md)** - Noob-friendly explainer for mkolbol’s OS‑cloud model

### Implementation Planning

- **[External Wrapper Sprints](external-wrapper-sprints.md)** - 8-sprint implementation plan for external wrapper system (40-60 days)

## Quick Start

1. Read **[Philosophy](01-philosophy.md)** to understand the core design principles
2. Read **[Core Architecture](02-core-architecture.md)** to see the kernel API
3. Read **[PTY Use Cases](04-pty-use-cases.md)** to see real-world examples
4. Browse other documents as needed for specific topics

## Key Principles

**Pure Plumbing:** The kernel is ~100 lines and only provides pipes, connections, and service registry. No protocols, no semantics.

**Protocol Agnostic:** Pipes carry anything - bytes, JSON-RPC, MCP, custom protocols. The kernel doesn't care.

**Location Transparent:** Same code runs in single process, multi-process, or distributed across machines. Only pipe implementations change.

**Infinitely Extensible:** New modules never require kernel changes. Modules compose using standard pipe interfaces.

## Vision

Build the most flexible PTY I/O system ever created:

- Hijack any terminal application's I/O
- Multi-modal rendering: xterm.js, Canvas, Video, TTS, AI-formatted text
- Multi-input: Keyboard, Voice, AI agents
- Distributed processing: GPU on remote machine, local display
- Browser-ready: Works in Node.js and browsers
- AI-first: Easy screenshot extraction, formatted text for LLMs

## Status

This RFC consolidates insights from extensive microkernel design conversations, drawing on proven patterns from Plan 9, QNX, L4, GNU Hurd, Erlang, and Kubernetes service mesh architectures.

**Current phase:** Design complete, ready for implementation.

**Next step:** Implement ~100 line kernel and basic modules.
