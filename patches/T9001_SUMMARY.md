# DEVEX Sprint P9 Summary: Local Node v1.0 Acceptance Pack

## Sprint Goals

Deliver a canonical acceptance testing framework for Local Node v1.0 (in-process Router) that enables early adopters to validate topologies on single hosts and serve as the foundation for future Acceptance Pack v1.

**Parallel Tasks:**
- **D9901**: Acceptance Pack v1 (Local Node) - templates + guide
- **D9902**: Local Node Quickstart - http-logs-local demo

---

## Deliverables

### D9902: Local Node Quickstart (✅ COMPLETE)

**Config:** `examples/configs/http-logs-local.yml`

**What it provides:**
- Self-contained HTTP server (no external dependencies)
- ExternalProcess module with stdio I/O mode
- ConsoleSink output module with prefix handling
- Demonstrates complete topology lifecycle (spawn → run → shutdown)

**Documentation:**
- **docs/devex/quickstart.md** - Added "Local Node v1.0 Demo: HTTP to Console" section
  - Multi-terminal walkthrough (3 terminals: runner, requester, watcher)
  - Live endpoint discovery with `mkctl endpoints --watch`
  - Configuration explanation with inline YAML comments
  - "Today vs Soon" migration path (ConsoleSink → FilesystemSink)

- **docs/devex/mkctl-cookbook.md** - Added "HTTP Logs Demo (Local Node v1.0)" quick reference
  - Cookbook-style entry point for users
  - Links to detailed quickstart

**Patch:** `patches/DIFF_D9902_local-quickstart.patch` (155 lines)

---

### D9901: Acceptance Pack v1 (✅ COMPLETE)

**New Files:**
- **tests/devex/acceptance/local-node-v1.md** - Canonical acceptance scenario document (478 lines)

**What it provides:**
- Complete end-to-end validation scenario for Local Node v1.0
- Scenario: HTTP application to console sink on single host
- Uses http-logs-local.yml from D9902 as the canonical reference config

**Scenario Validates:**
1. Config loading and YAML validation
2. ExternalProcess module spawning with stdio I/O
3. Stream wiring (kernel connections between modules)
4. RoutingServer endpoint registration and discovery
5. Graceful topology lifecycle (spawn → run → shutdown)
6. Local Node gate enforcement (`MK_LOCAL_NODE=1`)
7. Router snapshot generation (`reports/router-endpoints.json`)

**Five-Step Walkthrough:**
1. **Start topology** - Load config and run for 10 seconds
2. **Send HTTP request** - curl to demonstrate server responding
3. **Inspect live endpoints** - `mkctl endpoints --watch` shows active modules
4. **Graceful shutdown** - Topology terminates cleanly (timer or Ctrl+C)
5. **Verify snapshots** - Router persists endpoint metadata

**Verification Checklist:**
11-point checklist covering all critical paths (config validation, server startup, logging, endpoints, shutdown, snapshots)

**Troubleshooting Guide:**
Common errors (config not found, validation failures, no output, curl timeouts, missing endpoints) with solutions

**Today vs Soon:**
- **Today:** ConsoleSink for console output; users can tee to files (`… | tee logs.txt`)
- **Soon:** FilesystemSink module (Susan's sprint) with minimal config diff
- Node IDs stay stable (`web`, `sink`) for trivial migration

**Updated Documentation:**
- **tests/devex/README.md** - Added quick start section directing new users to local-node-v1.md
- **tests/devex/acceptance/README.md** - Added "Acceptance Scenarios" section indexing local-node-v1.md

**Patch:** `patches/DIFF_D9901_acceptance-pack.patch` (558 lines)
- Includes: new local-node-v1.md + updates to both README files

---

## Architecture Alignment

### Local Node v1.0 Scope

This sprint validates the **Local Node v1.0** architecture:

- **RoutingServer:** In-process endpoint registry with live discovery
- **Executor:** Topology loader and lifecycle manager
- **StateManager:** Stream wiring and kernel connections
- **Hostess:** Service registry with endpoint capabilities
- **ExternalProcess:** Module type for spawning external processes with stdio/pty modes
- **ConsoleSink:** Output module for console display with prefixes
- **MK_LOCAL_NODE=1 gate:** Enforces in-process-only routing (disables network features)

### Design Decisions

1. **Self-contained HTTP server** - Inline Node.js in config args (no external dependencies)
2. **Stable node IDs** - `web` and `sink` remain constant for future migrations
3. **Stdout logging** - HTTP server logs via console.log (demonstrates stdio handling)
4. **Prefix-based separation** - ConsoleSink `[http]` prefix for visual clarity
5. **Graceful lifecycle** - SIGTERM handling and cleanup validation

---

## Integration Points

### Acceptance Test Suite

These deliverables anchor the broader **Acceptance Pack v1**:

- **Unit tests** (threads lane) - Individual module testing (hostess.spec.ts, streams.spec.ts)
- **Process tests** (forks lane) - Lifecycle and process management (process-mode.spec.ts)
- **Integration scenario** (this sprint) - End-to-end topology validation (local-node-v1.md)

### Documentation Flow

1. **Early Adopter Guide** → High-level overview
2. **Quickstart (D9902)** → "Hello world" demo (30 seconds)
3. **Acceptance Scenario (D9901)** → Comprehensive validation walkthrough (5-10 minutes)
4. **First Server Tutorial** → Build custom modules
5. **Wiring and Testing Guide** → Advanced topologies

---

## Early Adopter Value

### Today: Validation Path

Early adopters can now:
1. Clone mkolbol and run `npm install && npm run build`
2. Follow `docs/devex/quickstart.md` for 30-second demo
3. Follow `tests/devex/acceptance/local-node-v1.md` for comprehensive validation
4. Verify all checkpoints pass
5. Proceed to build custom topologies with confidence

### Soon: Migration Path

When FilesystemSink lands:
- Config changes: `ConsoleSink` → `FilesystemSink`
- Node IDs unchanged: no topology restructuring
- Documentation diff minimal: one-line module swap
- Users incrementally adopt as ecosystem grows

---

## Testing & Verification

✅ **Build verified:** `npm run build` completes successfully
✅ **Documentation consistency:** All links and references verified
✅ **Scenario completeness:** 11-point checklist covers all integration points
✅ **Error handling:** Troubleshooting guide includes common failure modes

---

## Files Changed

| File | Type | Lines | Change |
|------|------|-------|--------|
| examples/configs/http-logs-local.yml | Example | 21 | D9902: New config |
| docs/devex/quickstart.md | Docs | +100 | D9902: New section |
| docs/devex/mkctl-cookbook.md | Docs | +15 | D9902: New section |
| tests/devex/README.md | Docs | +11 | D9901: Quick start |
| tests/devex/acceptance/README.md | Docs | +36 | D9901: New section |
| tests/devex/acceptance/local-node-v1.md | Docs | +478 | D9901: New scenario |

**Total:** 661 lines of new/modified content

---

## Patches Delivered

1. **patches/DIFF_D9902_local-quickstart.patch** (155 lines)
   - Config + documentation updates for quickstart

2. **patches/DIFF_D9901_acceptance-pack.patch** (558 lines)
   - Local Node v1.0 acceptance scenario + README updates

---

## Next Steps

### Immediate (DEVEX P10)
- Integrate acceptance pack into CI/CD pipeline
- Add Laminar test observability
- Create GitHub Actions workflow example

### Near-term (Susan's sprint: FilesystemSink P1)
- Deliver FilesystemSink module
- Update local-node-v1.md config to use FilesystemSink
- Minimal diff (3 lines) showing trivial migration

### Future (DEVEX P11+)
- Expand acceptance scenarios (error injection, multi-node, backpressure)
- Custom server wrapper templates
- Kubernetes deployment guide

---

## Success Metrics

✅ Early adopters have a canonical reference scenario  
✅ All 11 verification checkpoints are testable  
✅ Local Node v1.0 integration is documented end-to-end  
✅ Migration path to FilesystemSink is clear  
✅ Documentation is cohesive and cross-linked  
✅ Patches are reviewable and testable  

---

**Sprint Status:** ✅ COMPLETE

Both D9901 and D9902 are ready for merge. The Local Node v1.0 acceptance framework provides early adopters with a comprehensive validation path and serves as the anchor for the broader Acceptance Pack v1.
