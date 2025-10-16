export const RECIPES = [
    {
        name: 'tee-filesink',
        description: 'Duplicate output to console and file simultaneously',
        useCase: 'Log to file while monitoring console output',
        tags: ['logging', 'monitoring', 'fan-out'],
        topology: `nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 1000
      message: "Log entry"
  - id: tee1
    module: TeeTransform
    params:
      outputCount: 2
  - id: console1
    module: ConsoleSink
  - id: file1
    module: FilesystemSink
    params:
      path: ./logs/output.log
      mode: append
connections:
  - from: timer1.output
    to: tee1.input
  - from: tee1.output
    to: console1.input
  - from: tee1.output
    to: file1.input`
    },
    {
        name: 'rate-limit',
        description: 'Throttle message flow with token bucket rate limiting',
        useCase: 'Prevent overwhelming downstream systems',
        tags: ['rate-limiting', 'backpressure', 'throttling'],
        topology: `nodes:
  - id: source1
    module: TimerSource
    params:
      periodMs: 100
  - id: limiter1
    module: RateLimiterTransform
    params:
      capacity: 10
      refillRate: 2
      refillInterval: 1000
  - id: sink1
    module: ConsoleSink
connections:
  - from: source1.output
    to: limiter1.input
  - from: limiter1.output
    to: sink1.input`
    },
    {
        name: 'http-logs-jsonl',
        description: 'Fetch HTTP responses and log as JSONL with metrics',
        useCase: 'API monitoring and structured logging',
        tags: ['http', 'logging', 'metrics', 'jsonl'],
        topology: `nodes:
  - id: http1
    module: ExternalProcess
    params:
      command: curl
      args: ['-s', '-i', 'https://httpbin.org/get']
      ioMode: stdio
  - id: meter1
    module: PipeMeterTransform
    params:
      emitInterval: 1000
  - id: log1
    module: FilesystemSink
    params:
      path: ./logs/http-response.jsonl
      mode: append
      format: jsonl
connections:
  - from: http1.output
    to: meter1.input
  - from: meter1.output
    to: log1.input`
    },
    {
        name: 'transform-chain',
        description: 'Chain multiple transforms for data processing pipeline',
        useCase: 'Multi-stage data transformation',
        tags: ['pipeline', 'transform', 'processing'],
        topology: `nodes:
  - id: source1
    module: TimerSource
    params:
      periodMs: 500
      message: "raw data"
  - id: upper1
    module: UppercaseTransform
  - id: meter1
    module: PipeMeterTransform
  - id: sink1
    module: ConsoleSink
connections:
  - from: source1.output
    to: upper1.input
  - from: upper1.output
    to: meter1.input
  - from: meter1.output
    to: sink1.input`
    },
    {
        name: 'health-check',
        description: 'External process with startup health verification',
        useCase: 'Ensure service is healthy before routing traffic',
        tags: ['health-check', 'external-process', 'reliability'],
        topology: `nodes:
  - id: service1
    module: ExternalProcess
    params:
      command: node
      args: ['server.js']
      ioMode: stdio
      healthCheck:
        type: http
        url: http://localhost:3000/health
        timeout: 5000
        retries: 3
  - id: sink1
    module: ConsoleSink
connections:
  - from: service1.output
    to: sink1.input`
    }
];
export function listRecipes() {
    console.log('Available Recipes:\n');
    for (const recipe of RECIPES) {
        console.log(`  ${recipe.name}`);
        console.log(`    ${recipe.description}`);
        console.log(`    Use case: ${recipe.useCase}`);
        console.log(`    Tags: ${recipe.tags.join(', ')}`);
        console.log('');
    }
    console.log(`Use 'mk recipes --show <name>' to see full topology configuration.`);
}
export function showRecipe(name) {
    const recipe = RECIPES.find(r => r.name === name);
    if (!recipe) {
        console.error(`Recipe not found: ${name}`);
        console.error(`\nAvailable recipes: ${RECIPES.map(r => r.name).join(', ')}`);
        process.exit(1);
    }
    console.log(`# Recipe: ${recipe.name}\n`);
    console.log(`**Description**: ${recipe.description}`);
    console.log(`**Use Case**: ${recipe.useCase}`);
    console.log(`**Tags**: ${recipe.tags.join(', ')}\n`);
    console.log('## Topology Configuration\n');
    console.log('```yaml');
    console.log(recipe.topology);
    console.log('```');
}
//# sourceMappingURL=recipes.js.map