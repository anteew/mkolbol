# Sprint Log — SB-MK-ROUTER-P1

- **Date:** 2025-10-16
- **Tasks:** T9601–T9605 (RoutingServer P1 + mkctl routing UX)

## Highlights
- Tightened CI to capture raw logs for process-mode lanes and documented the policy in RFC 02.
- Landed the in-process `RoutingServer`, added integration tests, and wired executor announcements/withdrawals.
- Extended `mkctl run`/`mkctl endpoints` to persist and display router snapshots; added a cookbook and CLI tests.
- Updated quickstart / early-adopter docs with routing discovery guidance and expanded the router RFC with API details.

## Verification
- `npm run build`
- `npm run test:ci`
- `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty`
- `npx vitest run --reporter=default tests/integration/router-inproc.spec.ts tests/integration/router-announcements.spec.ts tests/cli/mkctlEndpoints.spec.ts`

## Notes
- Router snapshot lives at `reports/router-endpoints.json`; Hostess snapshot remains the fallback.
- mkctl docs now point to the cookbook and highlight `mkctl endpoints` for post-run inspection.
