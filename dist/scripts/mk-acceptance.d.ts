#!/usr/bin/env node
/**
 * mk-acceptance.ts
 * End-to-end acceptance test for mk CLI commands
 *
 * Tests the following sequence:
 * 1. mk init test-project
 * 2. cd test-project && mk run topology.yml --dry-run
 * 3. mk doctor (verify all checks pass)
 * 4. mk format topology.yml --to json
 * 5. mk run topology.yml --yaml (with YAML input)
 */
export {};
//# sourceMappingURL=mk-acceptance.d.ts.map