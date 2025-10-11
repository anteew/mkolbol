# PTY Use Cases

This document shows real-world examples of using the stream kernel for terminal I/O hijacking and multi-modal rendering.

## Vision

Transform terminal systems from:
```
[Keyboard] → [PTY] → [Screen]
```

To:
```
[Keyboard, Voice, AI, Network] → [PTY] → [Screen, Canvas, Video, Audio, AI, Browser]
```

## Use Case 1: Basic Terminal Hijacker

Intercept and observe terminal I/O:

```typescript
const kernel = new Kernel();

// Input
const keyboard = new KeyboardInput(kernel);

// Source
const pty = new LocalPTY(kernel);

// Output
const screen = new ScreenRenderer(kernel);

// Wire it up
kernel.connect(keyboard.output, pty.input);
kernel.connect(pty.output, screen.input);

// Now we're in the middle of the I/O!
// Can inspect, log, modify anything
```

## Use Case 2: Multi-Modal Output

One PTY, many renderers:

```typescript
const kernel = new Kernel();

const keyboard = new KeyboardInput(kernel);
const pty = new LocalPTY(kernel);

// Multiple output modules
const screen = new ScreenRenderer(kernel);
const canvas = new CanvasRenderer(kernel, document.getElementById('terminal'));
const recorder = new MP4Recorder(kernel, { fps: 30, width: 800, height: 600 });
const tts = new TextToSpeech(kernel);

// Input: keyboard → PTY
kernel.connect(keyboard.output, pty.input);

// Output: PTY → all renderers simultaneously
kernel.split(pty.output, [
  screen.input,
  canvas.input,
  recorder.input,
  tts.input
]);

// User sees:
// - Native terminal (screen)
// - HTML5 canvas rendering
// - Video being recorded
// - Hears output via TTS
```

## Use Case 3: AI-Enhanced Terminal

AI can observe and control:

```typescript
const kernel = new Kernel();

// Multiple inputs
const keyboard = new KeyboardInput(kernel);
const voice = new WhisperSTT(kernel);
const aiAgent = new MCPInput(kernel);

// Source
const pty = new DockerPTY(kernel, {
  image: 'ubuntu:latest',
  command: 'bash'
});

// Transforms
const parser = new ANSIParser(kernel);
const aiFormatter = new AITextFormatter(kernel);

// Outputs
const screen = new ScreenRenderer(kernel);
const screenshotter = new Screenshotter(kernel, { interval: 1000 });

// Multi-input → PTY
kernel.merge([
  keyboard.output,
  voice.output,
  aiAgent.output
], pty.input);

// PTY → Parser → Outputs
kernel.connect(pty.output, parser.input);
kernel.split(parser.output, [
  screen.input,
  aiFormatter.input
]);

// Feed screenshots and formatted text to AI
screenshotter.on('screenshot', (img) => {
  aiAgent.receiveContext({ type: 'screenshot', data: img });
});

aiFormatter.output.on('data', (text) => {
  aiAgent.receiveContext({ type: 'text', data: text });
});

// Now AI can:
// - See screenshots
// - Read formatted text
// - Send commands via aiAgent.sendCommand()
```

## Use Case 4: Browser Extension Integration

Run terminal in browser with extension control:

```typescript
// Running in browser (TypeScript compiled to JS)
const kernel = new Kernel();

// Browser-specific inputs
const devToolsInput = new ChromeDevToolsInput(kernel);
const extensionMessaging = new ExtensionMessaging(kernel);

// Source (runs in Web Worker for isolation)
const webWorkerPTY = new WebWorkerPTY(kernel);

// Browser renderers
const canvasRenderer = new CanvasRenderer(kernel, document.getElementById('terminal'));
const domRenderer = new XtermJSRenderer(kernel, document.getElementById('xterm'));

// Wire up
kernel.merge([
  devToolsInput.output,
  extensionMessaging.output
], webWorkerPTY.input);

kernel.split(webWorkerPTY.output, [
  canvasRenderer.input,
  domRenderer.input
]);

// Browser extension can now:
// - Control terminal
// - Inject commands
// - Extract output
// - Render in multiple ways
```

## Use Case 5: Remote GPU Processing

PTY on local machine, GPU processing on remote machine:

```typescript
// Machine A (laptop, no GPU)
const kernelA = new Kernel();

const keyboard = new KeyboardInput(kernelA);
const pty = new LocalPTY(kernelA);
const screen = new ScreenRenderer(kernelA);

// Create routing server
const router = new RoutingServer(kernelA);

// Terminal to remote machine C (has GPU)
const toMachineC = router.createTerminal('machine-c', 'network');

// Input: keyboard → PTY
kernelA.connect(keyboard.output, pty.input);

// Output: PTY → router (sends to GPU server on Machine C)
kernelA.connect(pty.output, router.input);

// Response from GPU server → screen
kernelA.connect(toMachineC.output, screen.input);

// ---

// Machine C (has GPU)
const kernelC = new Kernel();

const gpuServer = new GPUProcessor(kernelC);
const routerC = new RoutingServer(kernelC);

// Terminal from machine A
const fromMachineA = routerC.createTerminal('machine-a', 'network');

// Route from A → GPU server
kernelC.connect(fromMachineA.output, gpuServer.input);

// Route GPU results back to A
kernelC.connect(gpuServer.output, fromMachineA.input);

// PTY on A → GPU on C → Screen on A
// User on Machine A sees GPU-processed output!
```

## Use Case 6: Session Recording & Replay

Record terminal session, replay later:

```typescript
const kernel = new Kernel();

const keyboard = new KeyboardInput(kernel);
const pty = new LocalPTY(kernel);
const screen = new ScreenRenderer(kernel);

// Add recorder
const sessionRecorder = new SessionRecorder(kernel, {
  filename: 'session.log'
});

// Normal flow
kernel.connect(keyboard.output, pty.input);
kernel.connect(pty.output, screen.input);

// Also record everything
kernel.split(pty.output, [
  screen.input,
  sessionRecorder.input
]);

// Later: Replay session
const replayer = new SessionReplayer(kernel, {
  filename: 'session.log',
  speed: 2.0  // 2x speed
});

const replayScreen = new ScreenRenderer(kernel);
kernel.connect(replayer.output, replayScreen.input);

// Watch the session replay at 2x speed!
```

## Use Case 7: AI Training Data Collection

Collect terminal interactions for AI training:

```typescript
const kernel = new Kernel();

const keyboard = new KeyboardInput(kernel);
const pty = new LocalPTY(kernel);
const screen = new ScreenRenderer(kernel);

// AI data collectors
const screenshotter = new Screenshotter(kernel, {
  interval: 100,  // Every 100ms
  outputDir: '/training-data/screenshots'
});

const actionLogger = new ActionLogger(kernel, {
  outputFile: '/training-data/actions.jsonl'
});

const stateExtractor = new StateExtractor(kernel, {
  outputFile: '/training-data/states.jsonl'
});

// Normal flow
kernel.connect(keyboard.output, pty.input);
kernel.connect(pty.output, screen.input);

// Collect training data
keyboard.output.on('data', (keystroke) => {
  actionLogger.logAction({ type: 'keystroke', data: keystroke });
});

screenshotter.on('screenshot', (img) => {
  // Screenshot saved automatically
});

kernel.connect(pty.output, stateExtractor.input);
// Terminal states saved to JSONL

// Result: Complete dataset for training terminal-using AI agents
```

## Use Case 8: Collaborative Terminal

Multiple users control same terminal:

```typescript
const kernel = new Kernel();

// Multiple remote users
const user1Input = new WebSocketInput(kernel, { userId: 'alice' });
const user2Input = new WebSocketInput(kernel, { userId: 'bob' });
const user3Input = new WebSocketInput(kernel, { userId: 'charlie' });

// Shared PTY
const pty = new LocalPTY(kernel);

// Multiple user outputs
const user1Output = new WebSocketOutput(kernel, { userId: 'alice' });
const user2Output = new WebSocketOutput(kernel, { userId: 'bob' });
const user3Output = new WebSocketOutput(kernel, { userId: 'charlie' });

// All inputs → PTY
kernel.merge([
  user1Input.output,
  user2Input.output,
  user3Input.output
], pty.input);

// PTY → All outputs
kernel.split(pty.output, [
  user1Output.input,
  user2Output.input,
  user3Output.input
]);

// Alice, Bob, and Charlie can all:
// - Send commands
// - See the same output
// - Collaborate in real-time
```

## Use Case 9: Terminal Security Monitoring

Monitor and filter terminal commands:

```typescript
const kernel = new Kernel();

const keyboard = new KeyboardInput(kernel);
const pty = new LocalPTY(kernel);
const screen = new ScreenRenderer(kernel);

// Security modules
const commandFilter = new CommandFilter(kernel, {
  blocked: ['rm -rf /', 'dd if=/dev/zero'],
  alertCallback: (cmd) => {
    console.warn(`Blocked dangerous command: ${cmd}`);
  }
});

const auditLogger = new AuditLogger(kernel, {
  outputFile: '/var/log/terminal-audit.log'
});

// Input flow: keyboard → filter → audit → PTY
kernel.connect(keyboard.output, commandFilter.input);
kernel.connect(commandFilter.output, auditLogger.input);
kernel.connect(auditLogger.output, pty.input);

// Output flow: PTY → screen
kernel.connect(pty.output, screen.input);

// Dangerous commands are blocked before reaching PTY
// All commands are logged for audit
```

## Use Case 10: Accessibility

Terminal output to multiple accessibility devices:

```typescript
const kernel = new Kernel();

const keyboard = new KeyboardInput(kernel);
const pty = new LocalPTY(kernel);

// Accessibility outputs
const screen = new ScreenRenderer(kernel);
const tts = new TextToSpeech(kernel, {
  voice: 'en-US-Neural',
  rate: 1.2
});
const braille = new BrailleDisplay(kernel, {
  device: '/dev/ttyUSB0'
});
const largeText = new LargeTextRenderer(kernel, {
  fontSize: 24,
  highContrast: true
});

// Input
kernel.connect(keyboard.output, pty.input);

// Multi-modal accessibility output
kernel.split(pty.output, [
  screen.input,
  tts.input,
  braille.input,
  largeText.input
]);

// User can:
// - See normal screen
// - Hear via TTS
// - Read on braille display
// - See large high-contrast text
```

## Common Patterns

### Pattern: Transformation Pipeline

```typescript
source → transform1 → transform2 → transform3 → sink
```

Example:
```typescript
pty → ansiParser → textFormatter → compressionFilter → networkSender
```

### Pattern: Broadcast

```typescript
source → [sink1, sink2, sink3, ...]
```

Example:
```typescript
pty → [screen, recorder, logger, aiFormatter]
```

### Pattern: Aggregation

```typescript
[source1, source2, source3] → sink
```

Example:
```typescript
[keyboard, voice, aiCommands] → pty
```

### Pattern: Conditional Routing

```typescript
source → router → [sink1, sink2] (based on condition)
```

Example:
```typescript
pty → errorDetector → [normalScreen, errorHandler]
```

## Benefits

✅ **Flexibility:** Any module can be added without kernel changes  
✅ **Testability:** Each module tested in isolation  
✅ **Composability:** Complex behaviors from simple modules  
✅ **Reusability:** Same modules work in different compositions  
✅ **Extensibility:** New use cases = new module combinations  
✅ **Location transparency:** Modules work locally or distributed  

## Next Steps

See:
- **[Deployment Flexibility](05-deployment-flexibility.md)** - Run these examples in different deployment modes
- **[Distributed Service Mesh](06-distributed-service-mesh.md)** - Multi-machine use cases
- **[Module Types](03-module-types.md)** - How to build these modules
