# Rehydrate Checklist — Web Terminal + Bash Host (p14)

Branch

- mkolbol-devex-p14-web-terminal (PR #82)

State

- Examples added: src/examples/bash-shell-host.ts, src/examples/web-terminal-server.ts
- Front-end: examples/web-terminal/public/terminal.html (xterm.js)
- Docs: docs/devex/web-terminal-quickstart.md
- README: Quickstart link + npm scripts (dev:bash-host, dev:web-terminal)

Sanity

- export MK_LOCAL_NODE=1
- npm ci && npm run build
- npm run dev:web-terminal # WS:3001, HTML:9090
- Open http://localhost:9090 (or ssh -L 9090:localhost:9090 host)

Common Pitfalls

- Missing lock updates on ws/@types/ws: ensure package-lock.json is synced
- TTY required for PTY: run servers in a real terminal (not headless CI)
- Ports 3001/9090 busy: edit constants in web-terminal-server.ts

Next

- Merge #81 (calculator/ticker) if not already merged
- Merge #82 after checks pass (resolved conflicts with main)
- Consider mk init --preset web-terminal and mk self install/bootstrap (RFC v1)
