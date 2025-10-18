Rehydrate Checklist — Network Sprints P18 (TCP + WS)

Date: 2025-10-17
Owner: VEGA

Status

- P18A (TCP) merged to main (PR #86).
- P18B (WebSocket) merged to main (PR #87).

What to verify (post-merge)

- export MK_LOCAL_NODE=1
- npm ci && npm run build && npm run test:ci
- node dist/scripts/mk.js --help

Artifacts

- src/net/frame.ts, src/net/transport.ts (shared codec/transport)
- src/pipes/adapters/TCPPipe.ts, src/pipes/adapters/WebSocketPipe.ts
- tests/integration/tcpPipe.spec.ts, tests/integration/wsPipe.spec.ts
- examples/network/remote-viewer/_, examples/network/ws-smoke/_
- docs/devex/network-quickstart.md, docs/devex/remote-host-setup.md

Next (kickoff)

- Start P19-LINT: lint/format cleanup to reduce warning noise.
- Branch: mkolbol-devex-p19-lint-cleanup
- See devex.md sprint block P19-LINT for tasks and instructions.

---
Update 2025-10-18T0130Z — JSON Sprint Template + Validators
- Template: agent_template/agent_template.json (v2) — use to create single-file sprints: ampcode.json (core) or devex.json (DevEx).
- Logs: write JSON Lines to ampcode.log (core) or devex.log (DevEx). Schemas under agent_template/log_templates/.
- Validate locally: npm run validate:sprint (warn-only in pre-push).
- Archive previous sprint files to archives/ before creating new ones.
