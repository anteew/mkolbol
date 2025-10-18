# mkolbol

**Stream-based microkernel for AI agent systems**

## QUICKSTART — Build With mk (30–60s)

If the `mk` command isn’t in your PATH, run it via npm or node from this repo.

```bash
# 1) Prepare
export MK_LOCAL_NODE=1
npm ci && npm run build

# 2) Use mk via npm (inside this repo)
npm run mk -- --help

# 3) Scaffold the sample app (HTTP calculator)
npm run mk -- init hello-calculator --force
cd hello-calculator

# 4) Validate the topology (dry-run)
npm run mk -- run mk.json --dry-run

# 5) (Optional) Run the example calculator with mkctl
cd ..  # from inside hello-calculator, go back to repo root
node dist/scripts/mkctl.js run \
  --file examples/mk/hello-calculator/mk.yaml \
  --duration 10

# In another shell, exercise the calculator
curl 'http://localhost:4000/add?a=2&b=3'       # → {"result":5}
curl 'http://localhost:4000/subtract?a=10&b=7' # → {"result":3}

# Pro tip: make a short alias if you prefer direct invocation
alias mk="node $(pwd)/dist/scripts/mk.js"
```

Notes

- You can always run mk directly with `node dist/scripts/mk.js ...`.
- The `mk` and `mkctl` binaries are also exposed as npm scripts: `npm run mk -- …`, `npm run mkctl -- …`.
- Local‑node gate: keep `MK_LOCAL_NODE=1` set while dogfooding.
- **Want mk anywhere?** See [Installation: mk Anywhere](#installation-mk-anywhere-self-install) below.

## JSON Sprint Files + Logs (Quick Start)

- Template: `agent_template/agent_template.json` (v2). Create a single-file sprint:
  - Core: copy to `ampcode.json` and archive the previous file under `archives/`.
  - DevEx: copy to `devex.json` and archive the previous file under `archives/`.
- Logs: write JSON Lines entries to the role file:
  - Core (Susan): `ampcode.log` using `agent_template/log_templates/core_sprint_log.schema.json`.
  - DevEx (Vex): `devex.log` using `agent_template/log_templates/devex_sprint_log.schema.json`.
- Validate locally:
  - `npm run validate:sprint` (warn-only in the pre-push hook for now).

Examples

Append a core log entry (Susan) using jq:

```bash
BR=$(git rev-parse --abbrev-ref HEAD)
TS=$(date -u +%FT%TZ)
jq -nc --arg ts "$TS" --arg br "$BR" --arg sid "P25-MULTIPLEX" --arg tid "N2501" --arg msg "Begin FrameMux v1" '
  {ts:$ts, role:"core", agent:"susan", branch:$br, sprintId:$sid, taskId:$tid,
   event:"start", level:"info", message:$msg}
' >> ampcode.log
```

Append a DevEx log entry (Vex):

```bash
BR=$(git rev-parse --abbrev-ref HEAD)
TS=$(date -u +%FT%TZ)
jq -nc --arg ts "$TS" --arg br "$BR" --arg sid "P27-TLS" --arg tid "D2701" --arg msg "Add --tls/--mtls flags + docs" '
  {ts:$ts, role:"devex", agent:"devex", branch:$br, sprintId:$sid, taskId:$tid,
   event:"result", level:"info", message:$msg, ok:true}
' >> devex.log
```

Validate sprint files and logs:

```bash
npm run build && npm run validate:sprint
# or just:
npm run validate:sprint
```

Notes
- Keep exactly one active sprint file per role (ampcode.json OR devex.json). Move the prior file to `archives/`.
- Only modify paths listed in `tasks[].allowedFiles`. Deliver patches under `patches/`.
- When all teams switch to JSONL logs, we can make the validator fail on invalid entries.
