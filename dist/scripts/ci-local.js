#!/usr/bin/env tsx
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
async function runFastAcceptance() {
    console.log('Running fast CI acceptance tests...\n');
    const results = [];
    let passed = 0;
    let failed = 0;
    // Test 1: Frame codec
    console.log('[1/4] Testing FrameCodec...');
    const frameTest = await runTest('npx vitest run tests/net/frame.spec.ts --reporter=default');
    results.push({ name: 'FrameCodec', ...frameTest });
    if (frameTest.passed)
        passed++;
    else
        failed++;
    // Test 2: TCPPipe
    console.log('[2/4] Testing TCPPipe...');
    const tcpTest = await runTest('npx vitest run tests/integration/tcpPipe.spec.ts --reporter=default');
    results.push({ name: 'TCPPipe', ...tcpTest });
    if (tcpTest.passed)
        passed++;
    else
        failed++;
    // Test 3: WebSocketPipe
    console.log('[3/4] Testing WebSocketPipe...');
    const wsTest = await runTest('npx vitest run tests/integration/wsPipe.spec.ts --reporter=default');
    results.push({ name: 'WebSocketPipe', ...wsTest });
    if (wsTest.passed)
        passed++;
    else
        failed++;
    // Test 4: Remote viewer example (smoke)
    console.log('[4/5] Testing remote viewer example...');
    const viewerTest = await testRemoteViewer();
    results.push({ name: 'RemoteViewer', ...viewerTest });
    if (viewerTest.passed)
        passed++;
    else
        failed++;
    // Test 5: Federation acceptance
    console.log('[5/5] Testing router federation...');
    const federationTest = await runTest('npx tsx examples/network/federation-demo/test.ts');
    results.push({ name: 'FederationAcceptance', ...federationTest });
    if (federationTest.passed)
        passed++;
    else
        failed++;
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('CI LOCAL FAST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total:  ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('='.repeat(60));
    // Write report
    writeFileSync('reports/ci-local-fast.json', JSON.stringify(results, null, 2));
    console.log('\nReport written to reports/ci-local-fast.json');
    process.exit(failed > 0 ? 1 : 0);
}
async function runTest(command) {
    const start = Date.now();
    return new Promise((resolve) => {
        const proc = spawn(command, { shell: true, stdio: 'pipe' });
        proc.on('close', (code) => {
            const duration = Date.now() - start;
            resolve({
                passed: code === 0,
                duration,
                error: code !== 0 ? `Exit code ${code}` : undefined,
            });
        });
    });
}
async function testRemoteViewer() {
    const start = Date.now();
    return new Promise((resolve) => {
        // Start server
        const server = spawn('npx', ['tsx', 'examples/network/remote-viewer/server.ts'], {
            stdio: 'pipe',
        });
        // Wait for server to start
        setTimeout(() => {
            // Start client (connect and receive one message)
            const client = spawn('npx', ['tsx', 'examples/network/remote-viewer/client.ts'], {
                stdio: 'pipe',
            });
            let received = false;
            client.stdout?.on('data', (data) => {
                if (data.toString().includes('Connected')) {
                    received = true;
                    // Kill after receiving data
                    setTimeout(() => {
                        client.kill('SIGTERM');
                        server.kill('SIGTERM');
                    }, 1000);
                }
            });
            client.on('close', () => {
                server.kill('SIGTERM');
                const duration = Date.now() - start;
                resolve({
                    passed: received,
                    duration,
                    error: received ? undefined : 'No data received',
                });
            });
        }, 1000);
    });
}
runFastAcceptance().catch((err) => {
    console.error('Acceptance tests failed:', err);
    process.exit(1);
});
//# sourceMappingURL=ci-local.js.map