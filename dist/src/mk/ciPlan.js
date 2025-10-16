import { formatError } from './errors.js';
const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 64;
function generateCIPlan() {
    return {
        matrix: {
            node: ['20', '24'],
            lane: ['threads', 'forks']
        },
        cacheKeys: {
            'node-modules-20': 'node-modules-20-abc123',
            'node-modules-24': 'node-modules-24-def456'
        }
    };
}
function formatEnvOutput(plan) {
    const lines = [];
    // Matrix variables as JSON strings
    lines.push(`export MATRIX_NODE='${JSON.stringify(plan.matrix.node)}'`);
    lines.push(`export MATRIX_LANE='${JSON.stringify(plan.matrix.lane)}'`);
    // Cache keys as individual exports
    for (const [key, value] of Object.entries(plan.cacheKeys)) {
        const envKey = key.toUpperCase().replace(/-/g, '_');
        lines.push(`export CACHE_KEY_${envKey}=${value}`);
    }
    return lines.join('\n');
}
function formatJsonOutput(plan) {
    return JSON.stringify(plan, null, 2);
}
export async function ciPlanHandler(args) {
    try {
        let envOutput = false;
        let jsonOutput = false;
        for (const arg of args) {
            if (arg === '--env') {
                envOutput = true;
            }
            else if (arg === '--json') {
                jsonOutput = true;
            }
            else if (arg === '--help' || arg === '-h') {
                printHelp();
                return EXIT_SUCCESS;
            }
            else {
                console.error(`Unknown option: ${arg}`);
                console.error('Usage: mk ci plan [--env | --json]');
                return EXIT_USAGE;
            }
        }
        const plan = generateCIPlan();
        if (envOutput) {
            console.log(formatEnvOutput(plan));
        }
        else if (jsonOutput) {
            console.log(formatJsonOutput(plan));
        }
        else {
            console.log(formatJsonOutput(plan));
        }
        return EXIT_SUCCESS;
    }
    catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(formatError(err, 'text'));
        return EXIT_ERROR;
    }
}
function printHelp() {
    console.log(`mk ci plan — Generate CI matrix and cache keys for GitHub Actions

USAGE
  mk ci plan [--env | --json]

DESCRIPTION
  Outputs CI configuration for GitHub Actions workflows. Generates:
  - Node.js version matrix (e.g., 20, 24)
  - Test lane matrix (e.g., threads, forks)
  - Cache keys for node_modules

OPTIONS
  --env                  Output as shell export statements for sourcing
  --json                 Output as JSON (default)
  --help                 Show this message

EXAMPLES
  # JSON output (default)
  mk ci plan

  # Shell export format
  mk ci plan --env

  # Source into shell
  eval "$(mk ci plan --env)"

OUTPUT FORMATS
  JSON:
    {
      "matrix": {
        "node": ["20", "24"],
        "lane": ["threads", "forks"]
      },
      "cacheKeys": {
        "node-modules-20": "node-modules-20-abc123"
      }
    }

  ENV:
    export MATRIX_NODE='["20","24"]'
    export MATRIX_LANE='["threads","forks"]'
    export CACHE_KEY_NODE_MODULES_20=node-modules-20-abc123
    export CACHE_KEY_NODE_MODULES_24=node-modules-24-def456

LEARN MORE
  Full guide: https://mkolbol.dev/docs/devex/ci-acceptance-smoke`);
}
//# sourceMappingURL=ciPlan.js.map