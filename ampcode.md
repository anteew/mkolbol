````json

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "P24-FEDERATION", "parallel": false, "tasks": ["N2401","N2402","N2403"] }
  ],
  "branch": "mkolbol-net-p24-federation",
  "tasks": [
    {"id":"N2401","agent":"devex","title":"Federation API: Router↔Router adverts via PeerSource (static first)",
      "allowedFiles":["src/router/Federation.ts","src/router/RoutingServer.ts","tests/integration/router.federation.spec.ts"],
      "why":"Let routers share endpoint ads and TTL across peers.",
      "verify":["npm run build","npm run test:ci"],
      "deliverables":["patches/DIFF_N2401_router-federation.patch"]},

    {"id":"N2402","agent":"devex","title":"Failover & path preference: local > LAN > WAN; TTL propagation",
      "allowedFiles":["src/router/RoutingServer.ts","src/state/StateManager.ts","tests/integration/router.failover.spec.ts"],
      "why":"Choose best path and recover when peers die; respect liveness events.",
      "verify":["npm run build","npm run test:ci"],
      "deliverables":["patches/DIFF_N2402_router-failover.patch"]},

    {"id":"N2403","agent":"devex","title":"Acceptance: two routers, static peers → federation → fail one link",
      "allowedFiles":["examples/network/federation-demo/**","docs/devex/network-quickstart.md",".github/workflows/tests.yml"],
      "why":"Prove federation and failover without mDNS dependency.",
      "verify":["npm run ci:local:fast"],
      "deliverables":["patches/DIFF_N2403_federation-acceptance.patch"]}
  ]
}
````

Branch Instructions

- IMPORTANT: Work only on `mkolbol-net-p24-federation`.
- Start with ConfigPeerSource; later add MdnsPeerSource once P23 lands.
- Use existing subscribe() + TTL events; no polling.
- Keep federation eventual‑consistency; no strong ordering.

{
"ampcode": "v1",
"waves": [
{ "id": "P20A-ROUTER-P3", "parallel": false, "tasks": ["N2001","N2002","N2003"] }
],
"branch": "mkolbol-core-router-p3-subscribe",
"tasks": [
{"id":"N2001","agent":"susan","title":"RoutingServer: subscribe() API + event stream (added/updated/removed/staleExpired)",
"why":"Enable live route/liveness updates to consumers without polling.",
"allowedFiles":["src/router/RoutingServer.ts","src/executor/Executor.ts","src/types/router.ts","tests/integration/router.subscribe.spec.ts"],
"verify":["npm run build","npm run test:ci"],
"deliverables":["patches/DIFF_N2001_router-subscribe.patch"]},

    {"id":"N2002","agent":"susan","title":"Heartbeat/TTL integration: emit stale→expired transitions; snapshot includes expiresAt",
      "why":"Expose liveness semantics over subscriptions; align with TTL rules.",
      "allowedFiles":["src/router/RoutingServer.ts","tests/integration/router.ttl.spec.ts","tests/integration/router.subscribe.spec.ts"],
      "verify":["npm run build","npm run test:ci"],
      "deliverables":["patches/DIFF_N2002_router-ttl-subscribe.patch"]},

    {"id":"N2003","agent":"susan","title":"Acceptance: demo subscriber + soak under churn; Laminar artifacts",
      "why":"Prove stability and clear events under load and restarts.",
      "allowedFiles":["examples/network/subscriber-demo/**","docs/devex/network-quickstart.md","reports/**"],
      "verify":["npm run ci:local:fast"],
      "deliverables":["patches/DIFF_N2003_subscriber-acceptance.patch"]}

]
}

```

Branch Instructions

- IMPORTANT: Work only on `mkolbol-core-router-p3-subscribe`.
- Keep API minimal: subscribe(filter?): AsyncIterator<Event> or on('event', cb).
- Event types: {type:'added'|'updated'|'removed'|'stale'|'expired', endpoint, expiresAt?}.
- Tests must cover reconnect and TTL transitions.

{
"ampcode": "v1",
"waves": [
{ "id": "MKD-P4-A", "parallel": true, "tasks": ["T9401", "T9402", "T9403"] },
{ "id": "MKD-P4-B", "parallel": true, "depends_on": ["MKD-P4-A"], "tasks": ["T9404", "T9405"] }
],
"tasks": [
{
"id": "T9401",
"agent": "susan",
"title": "mk init: scaffold minimal project (+tests, .mk/options)",
"allowedFiles": [
"scripts/mk.ts",
"src/mk/init.ts",
"templates/init/**",
"tests/cli/mkInit.spec.ts"
],
"verify": ["npm run build"],
"deliverables": ["patches/DIFF_T9401_mk-init.patch"]
},

    {
      "id": "T9402",
      "agent": "susan",
      "title": "mk build: bundle via esbuild + provenance metadata",
      "allowedFiles": ["scripts/mk.ts", "src/mk/build.ts", "package.json"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9402_mk-build.patch"]
    },

    {
      "id": "T9403",
      "agent": "susan",
      "title": "mk package: capsule v0 (unsigned, deterministic)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/package.ts", "tests/cli/mkPackage.spec.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9403_mk-package-capsule.patch"]
    },

    {
      "id": "T9404",
      "agent": "susan",
      "title": "mk ci plan: emit CI matrix + cache keys (Laminar hooks)",
      "allowedFiles": ["scripts/mk.ts", "src/mk/ciPlan.ts", "docs/devex/ci-acceptance-smoke.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9404_mk-ci-plan.patch"]
    },

    {
      "id": "T9405",
      "agent": "susan",
      "title": "Did‑you‑mean suggestions for commands/flags (DX)",
      "allowedFiles": [
        "scripts/mk.ts",
        "src/mk/errors.ts",
        "docs/devex/mk-dx-style.md",
        "tests/cli/mkdxHelp.spec.ts"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9405_mk-did-you-mean.patch"]
    }

]
}

```

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "P17-A_ORCH_V1", "parallel": true, "tasks": ["T9701", "T9702", "T9703", "T9705"] },
    {
      "id": "P17-B_ROUTER_P2",
      "parallel": true,
      "depends_on": ["P17-A_ORCH_V1"],
      "tasks": ["T9711", "T9712", "T9713"]
    }
  ],
  "tasks": [
    {
      "id": "T9701",
      "agent": "susan",
      "title": "mk self install: where/uninstall/switch + --copy; Windows shims; doctor checks",
      "why": "Complete RFC v1 shim model so mk works anywhere without npm publish; add visibility and safe removal.",
      "allowedFiles": [
        "scripts/mk.ts",
        "src/mk/selfInstall.ts",
        "src/mk/doctor.ts",
        "tests/cli/mkSelf.spec.ts",
        "tests/cli/mkDoctor.spec.ts"
      ],
      "verify": [
        "npm run build",
        "node dist/scripts/mk.js self install --bin-dir ./.mk/bin --from repo",
        "node dist/scripts/mk.js self where --json"
      ],
      "deliverables": ["patches/DIFF_T9701_mk-self-install-complete.patch"]
    },

    {
      "id": "T9702",
      "agent": "susan",
      "title": "mk fetch <tag>: download toolchain tarball → ~/.mk/toolchains with SHA-256 verify",
      "why": "Enable offline & reproducible installs; prepares bootstrap to use cached tarballs.",
      "allowedFiles": ["scripts/mk.ts", "src/mk/fetch.ts", "tests/cli/mkFetch.spec.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9702_mk-fetch.patch"]
    },

    {
      "id": "T9703",
      "agent": "susan",
      "title": "mk bootstrap <app-dir>: out-of-tree scaffold using file: tarball or git tag",
      "why": "Let apps live outside the repo and still run mk quickly.",
      "allowedFiles": [
        "scripts/mk.ts",
        "src/mk/bootstrap.ts",
        "examples/mk/init-templates/**",
        "tests/cli/mkBootstrap.spec.ts"
      ],
      "verify": [
        "npm run build",
        "node dist/scripts/mk.js bootstrap /tmp/mk-calc --yes",
        "node /tmp/mk-calc/node_modules/.bin/ts-node -v || true"
      ],
      "deliverables": ["patches/DIFF_T9703_mk-bootstrap.patch"]
    },

    {
      "id": "T9705",
      "agent": "susan",
      "title": "mk doctor: toolchain/shim PATH + integrity checks",
      "why": "Fast diagnosis for naive users; surfaces exact remediation.",
      "allowedFiles": ["src/mk/doctor.ts", "tests/cli/mkDoctor.spec.ts", "docs/devex/doctor.md"],
      "verify": ["npm run build", "node dist/scripts/mk.js doctor --section toolchain --json"],
      "deliverables": ["patches/DIFF_T9705_mk-doctor-toolchain.patch"]
    },

    {
      "id": "T9711",
      "agent": "susan",
      "title": "RoutingServer TTL/heartbeat expiry + stale withdraw; snapshot expiresAt",
      "why": "Router P2 from RFC: liveness semantics for endpoints.",
      "allowedFiles": [
        "src/router/RoutingServer.ts",
        "src/executor/Executor.ts",
        "tests/integration/router.ttl.spec.ts"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9711_router-ttl.patch"]
    },

    {
      "id": "T9712",
      "agent": "susan",
      "title": "mkctl endpoints --watch shows liveness/TTL; supports --json with status",
      "why": "Expose liveness to users and scripts; aligns with snapshots.",
      "allowedFiles": [
        "scripts/mkctl.ts",
        "tests/cli/mkctlEndpoints.spec.ts",
        "docs/devex/mkctl-cookbook.md"
      ],
      "verify": [
        "npm run build",
        "node dist/scripts/mkctl.js endpoints --watch --runtime-dir . --json | head -n 1"
      ],
      "deliverables": ["patches/DIFF_T9712_mkctl-endpoints-liveness.patch"]
    },

    {
      "id": "T9713",
      "agent": "susan",
      "title": "Acceptance soak: TTL expiry under load (best-effort, non-gating)",
      "why": "Sanity check for leaks/backpressure with liveness updates.",
      "allowedFiles": [
        "docs/devex/ci-acceptance-smoke.md",
        ".github/workflows/tests.yml",
        "scripts/mk-acceptance.ts"
      ],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9713_router-ttl-soak.patch"]
    }
  ]
}
```

# Ampcode — P17: Orchestrator v1 (mk Anywhere) + Router P2 TTL

Goal

- Deliver mk “anywhere” without npm publish (shim + fetch + bootstrap) and add router liveness semantics with a minimal watch UX.

Constraints

- Keep Node 24 only. No network transports beyond what’s needed for fetch (HTTP GET). TTL is local-only; no gossip yet.

Verification (quick)

```bash
export MK_LOCAL_NODE=1
npm run build && npm run test:ci
node dist/scripts/mk.js self install --bin-dir ./.mk/bin --from repo
node dist/scripts/mk.js bootstrap /tmp/mk-calc --yes
node dist/scripts/mkctl.js endpoints --runtime-dir . --json | jq '.[0].status'
```

```json
{
  "ampcode": "v1",
  "waves": [{ "id": "P18A-TCP", "parallel": false, "tasks": ["N1801", "N1802", "N1803"] }],
  "branch": "mkolbol-net-p18a-tcp-pipe",
  "tasks": [
    {
      "id": "N1801",
      "agent": "susan",
      "title": "FrameCodec + Transport interface (pre-step)",
      "why": "Shared base for TCP/WS pipes; length-prefixed framing + ping/pong.",
      "allowedFiles": ["src/net/frame.ts", "src/net/transport.ts", "tests/net/frame.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_N1801_frame-transport.patch"]
    },

    {
      "id": "N1802",
      "agent": "susan",
      "title": "TCPPipe adapter + Remote Viewer example",
      "why": "Enable cross-process streams over TCP; simplest remote demo.",
      "allowedFiles": [
        "src/pipes/adapters/TCPPipe.ts",
        "examples/network/remote-viewer/**",
        "tests/integration/tcpPipe.spec.ts"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_N1802_tcp-pipe.patch"]
    },

    {
      "id": "N1803",
      "agent": "susan",
      "title": "Acceptance: PTY in proc A → TCP → viewer proc B (ephemeral ports)",
      "why": "Prove end-to-end with port collision safety and Laminar artifacts.",
      "allowedFiles": [
        "docs/devex/network-quickstart.md",
        ".github/workflows/tests.yml",
        "scripts/ci-local.ts"
      ],
      "verify": ["npm run build", "npm run ci:local:fast"],
      "deliverables": ["patches/DIFF_N1803_tcp-acceptance.patch"]
    }
  ]
}
```

Branch Instructions

- IMPORTANT: This sprint runs ONLY on branch `mkolbol-net-p18a-tcp-pipe`.
- Do not change branches or merge; commit patches and logs as usual. I will handle PRs/merges.
- Use ephemeral ports from 30010–30019 for tests. Avoid hard-coded 3000.

# Ampcode — MKD RC Sweep: Acceptance + Release Prep

Goal

- Perform an end‑to‑end RC sweep to validate mk’s first‑run experience and release path; finalize any small UX gaps.

Constraints

- Bundle uses esbuild; capsule is unsigned (deterministic filename); CI plan mirrors local behavior and Laminar hooks.

Verification

```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
```

```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "MKD-RC-A", "parallel": true, "tasks": ["T9501", "T9502"] },
    {
      "id": "MKD-RC-B",
      "parallel": true,
      "depends_on": ["MKD-RC-A"],
      "tasks": ["T9503", "T9504", "T9505"]
    }
  ],
  "tasks": [
    {
      "id": "T9501",
      "agent": "susan",
      "title": "Acceptance script: mk init → run → doctor → format → run --yaml (one-shot)",
      "allowedFiles": [
        "scripts/mk-acceptance.ts",
        "tests/devex/acceptance/local-node-v1.md",
        "package.json"
      ],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9501_mk-acceptance-script.patch"]
    },

    {
      "id": "T9502",
      "agent": "susan",
      "title": "CI smoke: mk init/build/package (non‑gating job)",
      "allowedFiles": [".github/workflows/tests.yml", "docs/devex/ci-acceptance-smoke.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9502_ci-mk-rc-smoke.patch"]
    },

    {
      "id": "T9503",
      "agent": "susan",
      "title": "mk build/package output polish (provenance path + friendly summary)",
      "allowedFiles": ["src/mk/build.ts", "src/mk/package.ts", "docs/devex/packaging.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9503_build-package-polish.patch"]
    },

    {
      "id": "T9504",
      "agent": "susan",
      "title": "mk ci plan: add --env output for export; doc examples",
      "allowedFiles": [
        "src/mk/ciPlan.ts",
        "tests/fixtures/mkdx/mk-ci-plan.help.txt",
        "docs/devex/ci-acceptance-smoke.md"
      ],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T9504_ci-plan-env.patch"]
    },

    {
      "id": "T9505",
      "agent": "susan",
      "title": "Help snapshots & did‑you‑mean finalization",
      "allowedFiles": ["tests/cli/mkdxHelp.spec.ts", "docs/devex/mk-dx-style.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9505_help-snapshots-final.patch"]
    }
  ]
}
```
