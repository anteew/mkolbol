```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "MCP-A", "parallel": true,  "tasks": ["T2701", "T2702"] },
    { "id": "MCP-B", "parallel": true,  "depends_on": ["MCP-A"], "tasks": ["T2703", "T2704"] },
    { "id": "MCP-C", "parallel": false, "depends_on": ["MCP-B"], "tasks": ["T2705"] }
  ],
  "tasks": [
    {
      "id": "T2701",
      "agent": "susan-1",
      "title": "MCP: implement tools (run, rules.get/set, digest.generate, logs.case.get, query, repro)",
      "allowedFiles": ["src/mcp/laminar/server.ts", "scripts/**"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T2701_mcp-tools.patch"]
    },
    {
      "id": "T2702",
      "agent": "susan-2",
      "title": "MCP: JSON contracts + error model + idempotence",
      "allowedFiles": ["src/mcp/laminar/server.ts", "README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T2702_mcp-contracts.patch"]
    },
    {
      "id": "T2703",
      "agent": "susan-3",
      "title": "MCP: focus overlays (ephemeral rules via MCP)",
      "allowedFiles": ["src/digest/generator.ts", "src/mcp/laminar/server.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T2703_mcp-focus-overlays.patch"]
    },
    {
      "id": "T2704",
      "agent": "susan-4",
      "title": "Tests: MCP tool happy/edge paths + concurrency",
      "allowedFiles": ["tests/mcp/laminarMcp.spec.ts"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2704_tests-mcp.patch"]
    },
    {
      "id": "T2705",
      "agent": "susan-5",
      "title": "Docs: MCP usage examples + tool schemas",
      "allowedFiles": ["README.md", "docs/testing/laminar.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T2705_docs-mcp.patch"]
    }
  ]
}
```

# Laminar MCP P2 — Tools + Overlays

**Goal**: Complete the MCP interface: expose core tools with stable JSON contracts, add ephemeral focus overlays, and cover with tests.

---

## Notes
- Fix minor defects surfaced during implementation (e.g., duplicate declarations in query).
- Keep responses compact and deterministic.

