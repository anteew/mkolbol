# Web Terminal Quickstart (xterm.js + WebSocket + PTY)

This guide shows how to run a bash shell in your browser using mkolbol. The browser connects via WebSockets to a Node server that bridges to a PTY (bash) hosted by mkolbol.

## Prerequisites

- Node.js 20+ (macOS/Linux/WSL). Ensure `node -v` prints 20.x or 24.x.
- Interactive terminal (PTY requires a TTY).

## Run the example

```bash
export MK_LOCAL_NODE=1
npm ci && npm run build

# Start the web terminal server (WS on 3001, HTML on 9090)
node dist/src/examples/web-terminal-server.js
```

Open the page:

- http://localhost:9090

Type commands in the browser terminal (ls, pwd, echo). The path is:

```
Browser (xterm.js) ←→ WebSocket (3001) ←→ mkolbol ←→ bash PTY ←→ OS
```

## SSH port forwarding (remote server)

If the server runs remotely and you browse from your laptop:

```bash
# From your laptop, reconnect with port forward:
ssh -L 9090:localhost:9090 <user>@<server-host>
# Then open http://localhost:9090 in your local browser
```

## Files

- `src/examples/web-terminal-server.ts` — Node server that spawns bash PTY and serves the terminal page.
- `examples/web-terminal/public/terminal.html` — HTML that embeds xterm.js and talks to the WebSocket.

## Notes

- Keep `MK_LOCAL_NODE=1` exported during local trials.
- PTY requires a TTY; run the server inside a real terminal.
- Change ports by editing constants at the top of `web-terminal-server.ts`.

## Next steps

- Add session recording with FilesystemSink.
- Split output (TTY + JSONL) using Tee and PipeMeter.
- Gate with a simple auth token on the WS (for multi-user setups).
