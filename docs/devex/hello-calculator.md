# Hello Calculator Tutorial

Build your first mkolbol topology in **10 minutes**. We'll create a simple calculator that takes numbers, performs operations, and displays results.

## What You'll Build

```
Number Generator → Calculator → Display Results
        ↓
   Every 1 sec
   (1, 2, 3, ...)
```

**Time breakdown:**

- 2 min: Create project structure
- 3 min: Write the calculator logic
- 2 min: Create config file
- 2 min: Run and test
- 1 min: Bonus — add a transform

## Step 1: Project Setup (2 min)

### Create the project directory

```bash
mkdir hello-calculator
cd hello-calculator
npm init -y
```

### Install mkolbol (Recommended: Tarball)

**Tarball (Reproducible, Recommended):**

```bash
# Local tarball from this repo
git clone https://github.com/anteew/mkolbol.git
cd mkolbol && npm ci && npm run build && npm pack
cd - && npm install ./mkolbol/mkolbol-*.tgz
```

**Or from Git tag:**

```bash
npm install github:anteew/mkolbol#v0.2.0
```

> Distribution note: mkolbol is not on npm. Use tarball or Git tag (above).

### Create folders

```bash
mkdir -p src config logs
```

Your structure:

```
hello-calculator/
├── src/
│   └── calculator.ts
├── config/
│   └── calculator.yml
├── package.json
└── tsconfig.json
```

## Step 2: Build the Calculator Module (3 min)

Create a custom module that performs arithmetic:

```typescript
// src/calculator.ts

import { Kernel } from 'mkolbol';

interface CalculatorOptions {
  operation?: 'add' | 'multiply' | 'square';
  operand?: number;
}

export class Calculator {
  inputPipe?: NodeJS.ReadableStream;
  outputPipe?: NodeJS.WritableStream;

  private operation: 'add' | 'multiply' | 'square' = 'add';
  private operand: number = 1;
  private count = 0;

  constructor(kernel: Kernel, options: CalculatorOptions = {}) {
    this.operation = options.operation ?? 'add';
    this.operand = options.operand ?? 1;
  }

  start(): void {
    if (!this.inputPipe || !this.outputPipe) {
      throw new Error('Pipes not connected');
    }

    this.inputPipe.on('data', (chunk: Buffer) => {
      const input = Number(chunk.toString().trim());
      let result: number;

      switch (this.operation) {
        case 'add':
          result = input + this.operand;
          break;
        case 'multiply':
          result = input * this.operand;
          break;
        case 'square':
          result = input * input;
          break;
        default:
          result = input;
      }

      this.count++;
      const output = `${input} → ${result} (operation #${this.count})\n`;
      this.outputPipe!.write(output);
    });

    this.inputPipe.on('end', () => {
      this.outputPipe!.end();
    });
  }

  stop(): void {
    console.log(`Calculator processed ${this.count} operations`);
  }
}
```

## Step 3: Create Configuration (2 min)

Create a YAML topology that uses built-in modules:

```yaml
# config/calculator.yml

# Number generator → Calculator → Console output
nodes:
  - id: generator
    module: TimerSource
    params:
      periodMs: 1000 # Emit every 1 second

  - id: display
    module: ConsoleSink
    params:
      prefix: '[calc]'

connections:
  - from: generator.output
    to: display.input
```

## Step 4: Run It! (2 min)

### Build the module

```bash
npx tsc src/calculator.ts --target es2020 --module commonjs --outDir dist
# or use your project's build setup
```

### Run the topology

```bash
# Run for 10 seconds
npx mkctl run --file config/calculator.yml --duration 10
```

**Expected output:**

```
[calc] tick
[calc] tick
[calc] tick
```

🎉 **Congrats!** You just ran your first topology!

## Bonus: Add Your Custom Calculator

Now let's integrate your calculator module:

### Step 1: Update config to use Calculator

```yaml
# config/calculator.yml

nodes:
  - id: generator
    module: TimerSource
    params:
      periodMs: 1000

  - id: calc
    module: Calculator
    params:
      operation: multiply
      operand: 10

  - id: display
    module: ConsoleSink
    params:
      prefix: '[result]'

connections:
  - from: generator.output
    to: calc.input
  - from: calc.output
    to: display.input
```

### Step 2: Register the module

In your code, register before running:

```typescript
import { Calculator } from './src/calculator';

executor.registerModule('Calculator', Calculator);
```

### Step 3: Run with custom module

```bash
# Run the full pipeline
npx mkctl run --file config/calculator.yml --duration 10
```

**Expected output:**

```
[result] tick → 10 (operation #1)
[result] tick → 20 (operation #2)
[result] tick → 30 (operation #3)
```

## Variations to Try

### Try 1: Different Operations

```yaml
params:
  operation: square
```

Output:

```
[result] tick → tick squared
[result] tick → tick squared
```

### Try 2: Save to File

Add a file sink:

```yaml
- id: file-logger
  module: FilesystemSink
  params:
    path: logs/calculations.log
    format: jsonl

connections:
  - from: calc.output
    to: file-logger.input
  - from: calc.output
    to: display.input
```

Then view results:

```bash
cat logs/calculations.log | jq '.data'
```

### Try 3: Add Rate Limiting

Use RateLimiter to throttle output:

```yaml
- id: limiter
  module: RateLimiterTransform
  params:
    tokensPerSecond: 2  # Max 2 per second

connections:
  - from: calc.output
    to: limiter.input
  - from: limiter.output
    to: display.input
```

## What You Learned

✅ Created a mkolbol project structure
✅ Built a custom module with options
✅ Created a topology configuration
✅ Ran and monitored a topology
✅ Combined built-in and custom modules

## Next Steps

- **More Examples**: See `examples/configs/` in the mkolbol repo
- **Reference**: [mkctl Cookbook](./mkctl-cookbook.md)
- **Deep Dive**: [Authoring a Module](./authoring-a-module.md)
- **Integrate**: [Using mkolbol in Your Repo](./using-mkolbol-in-your-repo.md)
- **Troubleshoot**: [Doctor Guide](./doctor.md)

## Complete Example

Here's the full calculator module for reference:

**src/calculator.ts**

```typescript
import { Kernel } from 'mkolbol';

interface CalculatorOptions {
  operation?: 'add' | 'multiply' | 'square';
  operand?: number;
}

export class Calculator {
  inputPipe?: NodeJS.ReadableStream;
  outputPipe?: NodeJS.WritableStream;

  private operation: 'add' | 'multiply' | 'square' = 'add';
  private operand: number = 1;
  private count = 0;

  constructor(kernel: Kernel, options: CalculatorOptions = {}) {
    this.operation = options.operation ?? 'add';
    this.operand = options.operand ?? 1;
  }

  start(): void {
    if (!this.inputPipe || !this.outputPipe) {
      throw new Error('Pipes not connected');
    }

    this.inputPipe.on('data', (chunk: Buffer) => {
      const input = Number(chunk.toString().trim());
      let result: number;

      switch (this.operation) {
        case 'add':
          result = input + this.operand;
          break;
        case 'multiply':
          result = input * this.operand;
          break;
        case 'square':
          result = input * input;
          break;
        default:
          result = input;
      }

      this.count++;
      const output = `${input} → ${result}\n`;
      this.outputPipe!.write(output);
    });

    this.inputPipe.on('end', () => {
      this.outputPipe!.end();
    });
  }

  stop(): void {
    console.log(`Processed ${this.count} operations`);
  }
}
```

**config/calculator.yml**

```yaml
nodes:
  - id: generator
    module: TimerSource
    params:
      periodMs: 1000

  - id: calc
    module: Calculator
    params:
      operation: multiply
      operand: 10

  - id: display
    module: ConsoleSink
    params:
      prefix: '[result]'

connections:
  - from: generator.output
    to: calc.input
  - from: calc.output
    to: display.input
```

**package.json**

```json
{
  "name": "hello-calculator",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "run": "npm run build && mkctl run --file config/calculator.yml --duration 10"
  },
  "dependencies": {
    "mkolbol": "^0.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## Ready to Build?

```bash
mkdir hello-calculator && cd hello-calculator
npm init -y
npm install mkolbol typescript ts-node
# Copy the code from above
npm run run
```

Welcome to mkolbol! 🚀
