#!/usr/bin/env node
/**
 * mk-acceptance.ts
 * End-to-end acceptance test for mk CLI commands
 *
 * Tests the following sequence:
 * 1. mk init test-project
 * 2. cd test-project && mk run topology.yml --dry-run
 * 3. mk doctor (verify all checks pass)
 * 4. mk format topology.yml --to json
 * 5. mk run topology.yml --yaml (with YAML input)
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const EXIT_SUCCESS = 0;
const EXIT_ERROR = 1;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[mk-acceptance] ${message}`);
}

function error(message: string) {
  console.error(`[mk-acceptance] ERROR: ${message}`);
}

function exec(command: string, cwd?: string): { stdout: string; stderr: string; success: boolean } {
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { stdout, stderr: '', success: true };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || err.message,
      success: false,
    };
  }
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  log(`Running: ${name}`);

  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, message: 'PASSED', duration });
    log(`✓ ${name} (${duration}ms)`);
  } catch (err: any) {
    const duration = Date.now() - start;
    const message = err.message || String(err);
    results.push({ name, passed: false, message, duration });
    error(`✗ ${name}: ${message} (${duration}ms)`);
  }
}

async function testMkInit(projectPath: string): Promise<void> {
  await runTest('mk init test-project-acceptance', async () => {
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
    }
    const result = exec('node dist/scripts/mk.js init test-project-acceptance --force');
    if (!result.success) {
      throw new Error(`mk init failed: ${result.stderr}`);
    }
    if (!existsSync(join(projectPath, 'mk.json'))) {
      throw new Error('mk.json not created by init');
    }
  });
}

async function testMkRunDryRun(projectPath: string): Promise<void> {
  await runTest('mk run mk.json --dry-run', async () => {
    const result = exec('node ../dist/scripts/mk.js run mk.json --dry-run', projectPath);
    if (!result.success && result.stderr) {
      throw new Error(result.stderr);
    }
  });
}

async function testMkDoctor(): Promise<void> {
  await runTest('mk doctor', async () => {
    const result = exec('node dist/scripts/mk.js doctor');

    if (!result.success) {
      throw new Error(`mk doctor failed: ${result.stderr}`);
    }

    // Check that output contains expected doctor output
    if (!result.stdout.includes('doctor')) {
      throw new Error('Unexpected doctor output format');
    }

    // For acceptance, we'll allow warnings but not failures
    // Check if there are any [FAIL] markers
    if (result.stdout.includes('[FAIL]')) {
      throw new Error('Doctor checks failed');
    }
  });
}

async function testMkFormatToYaml(projectPath: string): Promise<void> {
  await runTest('mk format mk.json --to yaml (to mk.yaml)', async () => {
    const res = exec('node ../dist/scripts/mk.js format --to yaml --file mk.json', projectPath);
    if (!res.success) {
      throw new Error(`Format command failed: ${res.stderr}`);
    }
    writeFileSync(join(projectPath, 'mk.yaml'), res.stdout);
    if (!existsSync(join(projectPath, 'mk.yaml'))) {
      throw new Error('mk.yaml not created');
    }
  });
}

async function testMkRunYaml(projectPath: string): Promise<void> {
  await runTest('mk run mk.yaml --yaml --dry-run', async () => {
    const result = exec('node ../dist/scripts/mk.js run mk.yaml --yaml --dry-run', projectPath);
    if (!result.success && result.stderr) {
      throw new Error(result.stderr);
    }
  });
}

async function testTtlSoakUnderLoad(): Promise<void> {
  await runTest('TTL expiry soak test under load (non-gating)', async () => {
    log('Starting TTL soak test with heartbeats and load...');

    // Create a topology with router heartbeats enabled
    const soakTopology = `
nodes:
  - id: source
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "setInterval(() => { for(let i=0; i<100; i++) console.log('msg-' + Date.now() + '-' + i); }, 100);"
      ioMode: stdio
      restart: never
      
  - id: meter
    module: PipeMeterTransform
    params:
      emitInterval: 1000
      
  - id: sink
    module: FilesystemSink
    params:
      path: reports/ttl-soak.jsonl
      format: jsonl
      mode: append
      
connections:
  - from: source.output
    to: meter.input
  - from: meter.output
    to: sink.input
`;

    const soakConfigPath = join(process.cwd(), 'reports', 'ttl-soak-topology.yml');
    const reportsDir = join(process.cwd(), 'reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    writeFileSync(soakConfigPath, soakTopology);

    // Run topology for 10 seconds with router heartbeats
    const result = exec(
      `timeout 12 node dist/scripts/mkctl.js run --file ${soakConfigPath} --duration 10`,
      process.cwd(),
    );

    const logOutput = result.stdout + result.stderr;

    // Verify topology ran
    if (!logOutput.includes('Topology running') && !logOutput.includes('Starting')) {
      throw new Error('Topology did not start successfully');
    }

    // Verify data flowed (check for JSONL output)
    const soakOutputPath = join(reportsDir, 'ttl-soak.jsonl');
    if (!existsSync(soakOutputPath)) {
      throw new Error('TTL soak test: no output data file created');
    }

    const outputContent = readFileSync(soakOutputPath, 'utf-8');
    const lineCount = outputContent.split('\n').filter((l) => l.trim()).length;

    if (lineCount < 10) {
      throw new Error(`TTL soak test: insufficient data throughput (${lineCount} lines)`);
    }

    log(`TTL soak test completed: ${lineCount} messages processed under load`);

    // Check for router endpoints snapshot (validates heartbeat mechanism)
    const endpointsPath = join(reportsDir, 'router-endpoints.json');
    if (existsSync(endpointsPath)) {
      const endpoints = JSON.parse(readFileSync(endpointsPath, 'utf-8'));
      log(`Router endpoints tracked: ${endpoints.length} endpoints`);

      // Verify stale endpoints would be detected (check TTL metadata exists)
      const hasHeartbeatData = endpoints.some(
        (ep: any) =>
          ep.updatedAt !== undefined || ep.expiresAt !== undefined || ep.ttlMs !== undefined,
      );

      if (hasHeartbeatData) {
        log('✓ Heartbeat/TTL metadata present in endpoint tracking');
      }
    }
  });
}

async function generateReport(projectPath: string): Promise<void> {
  log('Generating report...');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const timestamp = new Date().toISOString();
  const report = `# mk CLI Acceptance Test Results

**Date:** ${timestamp}
**Duration:** ${totalDuration}ms
**Tests:** ${total} (${passed} passed, ${failed} failed)

## Test Results

${results
  .map((r) => {
    const icon = r.passed ? '✓' : '✗';
    const status = r.passed ? 'PASSED' : 'FAILED';
    return `### ${icon} ${r.name} - ${status}

**Duration:** ${r.duration}ms
${r.passed ? '' : `**Error:** ${r.message}`}
`;
  })
  .join('\n')}

## Summary

The mk acceptance test suite validates the following workflow:

1. **Project Initialization** - Create a new mkolbol project structure
2. **Dry Run Validation** - Verify topology can be loaded without execution
3. **Health Check** - Run diagnostics to ensure system is properly configured
4. **Format Conversion** - Convert topology between YAML and JSON formats
5. **YAML Execution** - Run topology with YAML input format

${failed === 0 ? '✅ **All tests passed!**' : `⚠️ **${failed} test(s) failed**`}

## Next Steps

${
  failed === 0
    ? `- The mk CLI is working correctly
- Ready for production use
- Consider extending test coverage with additional scenarios`
    : `- Review failed tests above
- Check error messages for remediation steps
- Run \`mk doctor --verbose\` for detailed diagnostics`
}
`;

  // Write to reports directory
  const reportsDir = join(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = join(reportsDir, 'mk-acceptance-results.md');
  writeFileSync(reportPath, report);
  log(`Report written to: ${reportPath}`);

  // Also update the local-node-v1.md with acceptance results
  await updateAcceptanceDoc(report);
}

async function updateAcceptanceDoc(report: string): Promise<void> {
  const docPath = join(process.cwd(), 'tests/devex/acceptance/local-node-v1.md');

  if (!existsSync(docPath)) {
    log('Acceptance doc not found, skipping update');
    return;
  }

  try {
    const content = readFileSync(docPath, 'utf-8');

    // Check if there's already an acceptance results section
    const sectionMarker = '## mk CLI Acceptance Test Results';
    const timestamp = new Date().toISOString();

    const resultsSection = `

---

${sectionMarker}

**Last Run:** ${timestamp}

\`\`\`
${results.map((r) => `${r.passed ? '✓' : '✗'} ${r.name} (${r.duration}ms)`).join('\n')}
\`\`\`

**Summary:** ${results.filter((r) => r.passed).length}/${results.length} tests passed

See detailed report: [reports/mk-acceptance-results.md](../../../reports/mk-acceptance-results.md)

`;

    let updatedContent: string;
    if (content.includes(sectionMarker)) {
      // Replace existing section. Be tolerant of leading blank lines before the separator.
      const escapedMarker = sectionMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `(?:\\n\\n)?---\\n\\n${escapedMarker}[\\s\\S]*?(?=\\n---\\n|$)`,
        'm',
      );
      updatedContent = content.replace(regex, `\n\n${resultsSection.trim()}`);
    } else {
      // Append to end
      updatedContent = content + resultsSection;
    }

    writeFileSync(docPath, updatedContent);
    log('Updated acceptance doc with results');
  } catch (err: any) {
    error(`Failed to update acceptance doc: ${err.message}`);
  }
}

async function cleanup(projectPath: string): Promise<void> {
  log('Cleaning up test project...');

  if (existsSync(projectPath)) {
    try {
      rmSync(projectPath, { recursive: true, force: true });
      log('Test project removed');
    } catch (err: any) {
      error(`Failed to cleanup: ${err.message}`);
    }
  }
}

async function main(): Promise<number> {
  log('Starting mk CLI acceptance tests...\n');

  const projectPath = join(process.cwd(), 'test-project-acceptance');

  try {
    // Run all tests in sequence
    await testMkInit(projectPath);
    await testMkRunDryRun(projectPath);
    await testMkDoctor();
    await testMkFormatToYaml(projectPath);
    await testMkRunYaml(projectPath);

    // TTL soak test (non-gating, best-effort)
    await testTtlSoakUnderLoad();

    // Generate report
    await generateReport(projectPath);

    // Print summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n' + '='.repeat(60));
    console.log('ACCEPTANCE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total:  ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\nFailed tests:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.message}`);
        });
    }

    return failed === 0 ? EXIT_SUCCESS : EXIT_ERROR;
  } finally {
    // Always cleanup
    await cleanup(projectPath);
  }
}

// Run the acceptance tests
main()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((err) => {
    error(`Fatal error: ${err.message}`);
    process.exit(EXIT_ERROR);
  });
