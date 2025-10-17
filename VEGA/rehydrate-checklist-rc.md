# Rehydrate Checklist — MKD RC (p13)

1. Branch + Mailboxes

- Checkout: mkolbol-devex-p13
- Susan reads: ampcode.md:1
- Vex reads: devex.md:1

2. Sanity

- export MK_LOCAL_NODE=1
- npm run build && npm run test:ci
- node dist/scripts/mk.js --help

3. Quick mk sweep

- node dist/scripts/mk.js init demo-app --force && cd demo-app
- node ../dist/scripts/mk.js run mk.json --dry-run
- node ../dist/scripts/mk.js doctor
- node ../dist/scripts/mk.js format --to yaml --in-place && node ../dist/scripts/mk.js run --yaml
- node ../dist/scripts/mk.js build && node ../dist/scripts/mk.js package && node ../dist/scripts/mk.js ci plan --format json

4. Docs to review

- docs/devex/first-five-minutes.md (Hello in 10m)
- docs/devex/releases.md (RC notes)
- docs/devex/ci-acceptance-smoke.md (smoke and plan)

5. Open tasks (p13)

- Acceptance one-shot script
- CI smoke for mk init/build/package
- build/package output polish
- ci plan --env
- help snapshots + did-you-mean pass
