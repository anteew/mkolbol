# Sprint 5: Modules + Observability

Scope
- Add more utility modules and cross-cutting observability as stream transforms.
- Keep kernel unchanged; add modules for logging/metrics/throttling.

Stories
- Modules:
  - JsonStringifyTransform, JsonParseTransform
  - FilterTransform(predicate)
  - ThrottleTransform(rate)
  - TeeTransform (fan-out)
- Observability:
  - LogTransform: attaches metadata, logs frames
  - MetricsTransform: counts, rates, simple histograms per connection
  - EventLogAdapter: forward topology and metrics events to a sink
- Example pipelines showcasing observability in-line without kernel changes.

Deliverables
- src/modules/* additional transforms
- src/observability/* transforms and types
- tests/modules/*.spec.ts
- examples/observability-topology.ts

Out of Scope
- External metrics backends, persistence beyond console.

Demo Checklist
- Examples run and display logs/metrics; tests validate composition.
