# Rehydrate Notes

## Latest Sprint
- **ID:** SB-MK-ROUTER-P1
- **Timestamp:** 2025-10-16 04:17Z (see ampcode.log entry)
- **Tasks:** T9601–T9605 (CI enforcement, RoutingServer P1, mkctl endpoints/docs)

## Deliverable Patches
- `patches/DIFF_T9601_ci-process-enforce.patch`
- `patches/DIFF_T9602_router-skeleton.patch`
- `patches/DIFF_T9603_router-announcements.patch`
- `patches/DIFF_T9604_mkctl-endpoints-router.patch`
- `patches/DIFF_T9605_router-docs.patch`

## Verification Commands
```bash
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
npx vitest run --reporter=default \
  tests/integration/router-inproc.spec.ts \
  tests/integration/router-announcements.spec.ts \
  tests/cli/mkctlEndpoints.spec.ts
```

## Key Artifacts
- Router snapshot written by `mkctl run`: `reports/router-endpoints.json`
- mkctl cookbook: `docs/devex/mkctl-cookbook.md`
- Routing RFC: `docs/rfcs/stream-kernel/05-router.md`
- Executor now forwards announcements via `setRoutingServer()`

## Checklist After Rehydrate
1. Confirm patch files exist in `patches/`.
2. Reinstall deps (`npm ci`) and rebuild (`npm run build`).
3. Re-run verification commands above.
4. Append future sprint logs to `ampcode.log` using template in `SUSAN/ampcode-log-template.md`.
5. Update sprint diary in `SUSAN/` on completion.
