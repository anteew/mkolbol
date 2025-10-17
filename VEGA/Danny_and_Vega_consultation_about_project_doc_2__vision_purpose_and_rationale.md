# Doc 2 — Vision/Purpose, Concrete Ideas, Why It Matters

## Vision/Purpose

- Align terminology and deployment/supervision model with Mach/Hurd: servers run on/through the kernel (user space), not in it; kernel stays policy‑free.
- Support multiple deployment models (single process, multi‑process, distributed, embedded) without changing kernel/server APIs.

## Concrete Ideas

- Correct phrasing: “servers run on top of / communicate through the kernel”; avoid “in the kernel.”
- Supervision: kernel does not restart servers; use bootstrap/init or a dedicated supervisor server; peer/externals can monitor.
- Deployment models:
  - Single process (PassThrough pipes)
  - Multi‑process (Unix socket–backed pipes)
  - Distributed (TCP/WebSocket–backed pipes)
  - Bare‑metal thought experiment (ring buffers/HAL)
- Location transparency principle (L4/QNX): same API, different transports; configuration selects placement.
- Terminology cheat sheet for consistent documentation and marketing.

## Why It Matters

- Prevents architectural confusion; eases onboarding and collaboration.
- Keeps mechanism vs policy separation crisp, aiding maintainability and security review.
- Enables smooth evolution from dev → test → prod with the same code paths.
