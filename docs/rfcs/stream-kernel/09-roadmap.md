# Implementation Roadmap

## Phase 1: Core Kernel (Week 1)

**Goal:** ~100 line kernel that works in single process

**Deliverables:**

- [ ] Kernel implementation (createPipe, connect, split, merge, register, lookup)
- [ ] StateManager/ControlPlane (topology tracking, wiring configs, introspection API)
- [ ] Basic modules: KeyboardInput, LocalPTY, TerminalOutput
- [ ] Configuration loader (YAML) for wiring configs
- [ ] Wiring config validator (compile-time validation)
- [ ] Unit tests for kernel
- [ ] Unit tests for StateManager
- [ ] Unit tests for basic modules

**Success criteria:** Run `bash` with keyboard → PTY → screen, export topology diagram

**Estimated effort:** 4-6 days

## Phase 2: Parsers & Renderers (Week 2)

**Goal:** Multi-modal output

**Deliverables:**

- [ ] XtermParser (ANSI → structured terminal state)
- [ ] CanvasRenderer (HTML5 canvas output)
- [ ] XtermJSRenderer (xterm.js integration)
- [ ] Service registry with capability matching
- [ ] Integration tests for multi-modal output

**Success criteria:** Display terminal in canvas AND xterm.js simultaneously

**Estimated effort:** 5-7 days

## Phase 3: AI Integration (Week 3)

**Goal:** AI can observe and control terminals

**Deliverables:**

- [ ] AITextFormatter (terminal → LLM-friendly text)
- [ ] Screenshotter (periodic screenshots)
- [ ] WhisperSTT (speech-to-text input)
- [ ] MCPInput (AI agent commands)
- [ ] Example: AI controlling terminal

**Success criteria:** AI receives screenshots/text and sends commands

**Estimated effort:** 5-7 days

## Phase 4: Multi-Process Deployment (Week 4)

**Goal:** Same code runs multi-process with crash isolation

**Deliverables:**

- [ ] Transport abstraction (`createPipe(type)`)
- [ ] UnixSocketPipe implementation
- [ ] Process spawning / supervision
- [ ] Configuration-driven topology
- [ ] Multi-process example (PTY in separate process)

**Success criteria:** Run with PTY isolated in separate process

**Estimated effort:** 5-7 days

## Phase 5: Distributed Service Mesh (Week 5-6)

**Goal:** Multi-machine deployment with automatic routing

**Deliverables:**

- [ ] RoutingServer module
- [ ] Terminal management (local, network, loopback)
- [ ] Service discovery (broadcast announcements)
- [ ] Multi-hop routing
- [ ] TCPPipe / WebSocketPipe implementations
- [ ] Configuration-driven machine topology
- [ ] Example: Remote GPU processing

**Success criteria:** PTY on Machine A, GPU on Machine C, display on Machine A

**Estimated effort:** 7-10 days

## Phase 6: Advanced Modules (Week 7)

**Goal:** Complete module ecosystem

**Deliverables:**

- [ ] DockerPTY (containerized terminals)
- [ ] MP4Recorder (video recording)
- [ ] TextToSpeech (audio output)
- [ ] SessionRecorder/Replayer
- [ ] CommandFilter (security)
- [ ] AuditLogger

**Success criteria:** Full multi-modal I/O with recording/security

**Estimated effort:** 5-7 days

## Phase 7: Browser Integration (Week 8-9)

**Goal:** Terminal runs in browser with extension support

**Deliverables:**

- [ ] Browser-compatible kernel (stream polyfill)
- [ ] Chrome extension scaffolding
- [ ] DevTools panel integration
- [ ] Native messaging bridge
- [ ] WebWorkerPTY (browser-compatible PTY)
- [ ] Example: Terminal in DevTools

**Success criteria:** Terminal running in browser DevTools

**Estimated effort:** 7-10 days

## Phase 8: MCP/Protocol Layer (Week 10)

**Goal:** Stream kernel powers AI agent communication

**Deliverables:**

- [ ] MCPRouter module (Layer 3)
- [ ] JSON-RPC transport module
- [ ] HTTP/SSE transport module
- [ ] Plugin system for MCP tools/resources
- [ ] Integration with mkolbol AI agent system
- [ ] Example: MCP server on stream kernel

**Success criteria:** MCP server running, compatible with existing MCP clients

**Estimated effort:** 5-7 days

## Total Timeline

**Estimated total:** 10-12 weeks for complete implementation

## Parallel Work Opportunities

Some phases can be parallelized with multiple developers/agents:

**Week 4-6:**

- Developer A: Multi-process deployment
- Developer B: Advanced modules (Docker, MP4, TTS)

**Week 7-9:**

- Developer A: Distributed service mesh
- Developer B: Browser integration

**Week 10:**

- Developer A: MCP/Protocol layer
- Developer B: Documentation, examples, tutorials

## Milestones

**Milestone 1 (End of Phase 1):** Basic PTY hijacking works  
**Milestone 2 (End of Phase 2):** Multi-modal output works  
**Milestone 3 (End of Phase 3):** AI integration works  
**Milestone 4 (End of Phase 4):** Multi-process deployment works  
**Milestone 5 (End of Phase 5):** Distributed deployment works  
**Milestone 6 (End of Phase 8):** Production-ready system

## Success Metrics

| Metric                     | Target                   |
| -------------------------- | ------------------------ |
| Kernel lines of code       | < 150                    |
| StateManager lines of code | < 500                    |
| Kernel test coverage       | > 90%                    |
| StateManager test coverage | > 85%                    |
| Module test coverage       | > 80%                    |
| Integration tests          | > 20 scenarios           |
| Example applications       | > 5                      |
| Documentation              | Complete for all modules |

## Risk Mitigation

**Risk:** Browser compatibility issues  
**Mitigation:** Start browser work early (Phase 2), use polyfills

**Risk:** Network transport complexity  
**Mitigation:** Use battle-tested libraries (ws, net), extensive testing

**Risk:** Performance issues with multi-hop routing  
**Mitigation:** Benchmark early, optimize hot paths, consider caching

**Risk:** Scope creep  
**Mitigation:** Stick to roadmap, defer nice-to-haves to post-v1.0

## Post-1.0 Roadmap

Future enhancements (not in initial scope):

- [ ] Rust kernel implementation (for bare metal)
- [ ] Mobile support (React Native integration)
- [ ] Hardware acceleration (GPU-based rendering)
- [ ] Advanced security (E2E encryption, sandboxing)
- [ ] Telemetry & observability (distributed tracing)
- [ ] Admin dashboard (monitor distributed deployments)
- [ ] Plugin marketplace (community modules)

## Next Steps

1. Review and approve this roadmap
2. Begin Phase 1: Core Kernel implementation
3. Set up CI/CD for automated testing
4. Create example repository for each phase
