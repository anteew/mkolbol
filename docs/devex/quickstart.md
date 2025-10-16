# Quickstart: PTY to XtermTTYRenderer Demo

This guide shows you how to run a simple demonstration of mkolbol's PTY (pseudo-terminal) capabilities with the XtermTTYRenderer module. The demo spawns a bash shell in a PTY, pipes its output through the renderer to your terminal, sends a simple echo command, and then exits cleanly.

## Prerequisites

- **Node.js 20 or higher** (tested on Node 20.x and 24.x)
- **npm** (comes with Node.js)
- **macOS or Linux** (Windows support coming soon)
- **PTY support** on your system (available by default on macOS/Linux)

## Installation and Build

Clone the repository (if you haven't already) and install dependencies:

```bash
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm install
```

Build the project:

```bash
npm run build
```

This compiles TypeScript source files to JavaScript in the `dist/` directory.

## Running the Demo

Execute the PTY renderer demo:

```bash
node dist/src/examples/tty-renderer-demo.js
```

### What You'll See

The demo will:
1. Enter alternate screen buffer (clears your terminal view)
2. Spawn a bash shell in a PTY
3. Send the command: `echo "xterm TTY renderer demo"`
4. Display the bash prompt, command, and output with ANSI formatting
5. Send the `exit` command to close the shell
6. Exit the alternate screen buffer and return to your normal terminal

**Expected output** (with ANSI escape sequences visible):

```
echo "xterm TTY renderer demo"
[?2004h]0;user@hostname: /path/to/mkolbol[01;32muser@hostname[00m:[01;34m/path/to/mkolbol[00m$ echo "xterm TTY renderer demo"
[?2004lxterm TTY renderer demo
[?2004h]0;user@hostname: /path/to/mkolbol[01;32muser@hostname[00m:[01;34m/path/to/mkolbol[00m$ exit
[?2004lexit
```

The output includes:
- ANSI escape codes for colors (e.g., `[01;32m` for green bold text)
- Bracketed paste mode sequences (`[?2004h` and `[?2004l`)
- Terminal title sequences (`]0;...`)
- Your actual shell prompt with username and current directory
- The echo command output: `xterm TTY renderer demo`

The demo automatically exits after approximately 1.2 seconds.

## How to Exit

The demo exits automatically. If you modify the demo code and it hangs:

- **Ctrl+C** - Interrupt the process
- **Ctrl+Z** followed by `kill %1` - Suspend and kill the background job

If the terminal state is corrupted after an abrupt exit:

```bash
reset
```

This will restore your terminal to a clean state.

## Understanding the Demo

The demo demonstrates a complete PTY pipeline:

```
PTYServerWrapper (bash) → XtermTTYRenderer → Terminal Output
```

**Key components:**

- **PTYServerWrapper**: Spawns and manages a bash process with PTY support
- **XtermTTYRenderer**: Renders raw ANSI output to the terminal (with optional alternate screen buffer)
- **Alternate Screen Buffer**: The demo uses `altBuffer: true` to avoid cluttering your terminal history

**Source code:** [src/examples/tty-renderer-demo.ts](../../src/examples/tty-renderer-demo.ts)

## Troubleshooting

### Error: "Cannot find module"

**Problem:** The demo file doesn't exist in `dist/src/examples/`.

**Solution:** Rebuild the project:

```bash
npm run build
```

### Error: "spawn EACCES" or PTY permission denied

**Problem:** Insufficient permissions to create a PTY.

**macOS Solution:**
- Check System Preferences → Security & Privacy → Privacy → Developer Tools
- Grant Terminal.app or your terminal emulator full disk access

**Linux Solution:**
- Ensure your user is in the `tty` group:
  ```bash
  groups | grep tty
  ```
- If not, add yourself:
  ```bash
  sudo usermod -a -G tty $USER
  ```
- Log out and log back in for changes to take effect

### Error: "node-pty" module not found

**Problem:** The `node-pty` native dependency is not installed.

**Solution:**

1. Ensure you have build tools installed:
   - **macOS**: `xcode-select --install`
   - **Debian/Ubuntu**: `sudo apt-get install build-essential python3`
   - **RHEL/CentOS**: `sudo yum install gcc-c++ make python3`

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Node version mismatch

**Problem:** Using an unsupported Node.js version.

**Solution:** Upgrade to Node 20 or higher:

```bash
# Check current version
node --version

# Install nvm (Node Version Manager) if needed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 20
nvm install 20
nvm use 20
```

### Terminal corrupted after demo

**Problem:** ANSI escape sequences or alternate buffer state persist after exit.

**Solution:** Reset your terminal:

```bash
reset
```

Or manually exit alternate screen buffer:

```bash
echo -e "\033[?1049l"
```

## Under the Hood

This demo uses mkolbol's **ExternalProcess** support with PTY mode. The PTYServerWrapper internally uses:

```yaml
params:
  command: /bin/bash
  ioMode: 'pty'                    # PTY mode (vs. stdio)
  terminalType: 'xterm-256color'   # Terminal emulation
```

To understand how to configure external processes from YAML/JSON files, see **[Wiring and Testing](./wiring-and-tests.md#external-process-configuration)** guide.

For non-interactive data pipelines using `stdio` mode, see the **[StdIO Path](./stdio-path.md)** guide.

## Next Steps

After running this demo, explore:

- **[Early Adopter Guide](./early-adopter-guide.md)** - Understanding mkolbol concepts
- **[Interactive Topology](./interactive-topology.md)** - Keyboard → PTY → TTY pipelines
- **[Wiring and Testing](./wiring-and-tests.md)** - Configuration and testing (including external processes)
- **[StdIO Path](./stdio-path.md)** - Non-interactive filters and data pipelines
- **[Stream Kernel RFC](../rfcs/stream-kernel/00-index.md)** - Architecture and design philosophy
- **[PTY Use Cases](../rfcs/stream-kernel/04-pty-use-cases.md)** - Real-world terminal hijacking examples
- **[Examples Directory](../../src/examples/)** - More demos (split, merge, executor, multi-modal)
- **[Testing with Laminar](../laminar-workflow.md)** - Test observability and structured logging

## Feedback

Found an issue or have suggestions? Open an issue at:
https://github.com/anteew/mkolbol/issues
