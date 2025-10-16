#!/usr/bin/env tsx
/**
 * Consumer acceptance test
 *
 * Tests mkolbol installation from a local tarball in a fresh fixture app.
 * This validates the packaging, exports, and basic functionality from a
 * consumer's perspective.
 */
import { execSync, spawn } from 'child_process';
import { mkdtempSync, cpSync, existsSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
const PROJECT_ROOT = new URL('..', import.meta.url).pathname;
const FIXTURE_DIR = join(PROJECT_ROOT, 'tests/consumer/fixture-app');
const DIST_DIR = join(PROJECT_ROOT, 'dist');
function exec(cmd, cwd = PROJECT_ROOT) {
    console.log(`\n[test-consumer] $ ${cmd}`);
    try {
        return execSync(cmd, {
            cwd,
            encoding: 'utf8',
            stdio: ['inherit', 'pipe', 'pipe']
        });
    }
    catch (err) {
        console.error(`Command failed: ${cmd}`);
        console.error(err.stdout);
        console.error(err.stderr);
        throw err;
    }
}
function execAsync(cmd, args, cwd) {
    return new Promise((resolve) => {
        console.log(`\n[test-consumer] $ ${cmd} ${args.join(' ')}`);
        const proc = spawn(cmd, args, { cwd });
        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (data) => {
            const str = data.toString();
            stdout += str;
            process.stdout.write(str);
        });
        proc.stderr?.on('data', (data) => {
            const str = data.toString();
            stderr += str;
            process.stderr.write(str);
        });
        proc.on('close', (code) => {
            resolve({ code: code || 0, stdout, stderr });
        });
    });
}
async function main() {
    console.log('==========================================');
    console.log('Consumer Acceptance Test');
    console.log('==========================================\n');
    // Step 1: Build the project
    console.log('[1/6] Building mkolbol...');
    if (!existsSync(DIST_DIR)) {
        exec('npm run build');
    }
    else {
        console.log('  ✓ dist/ already exists, skipping build');
    }
    // Step 2: Create tarball
    console.log('\n[2/6] Creating tarball...');
    const packOutput = exec('npm pack');
    const tarballName = packOutput.trim().split('\n').pop();
    console.log(`  ✓ Created: ${tarballName}`);
    // Step 3: Create temporary test directory
    console.log('\n[3/6] Setting up test environment...');
    const tempDir = mkdtempSync(join(tmpdir(), 'mkolbol-consumer-test-'));
    console.log(`  ✓ Temp dir: ${tempDir}`);
    try {
        // Copy fixture files to temp directory
        cpSync(FIXTURE_DIR, tempDir, { recursive: true });
        console.log('  ✓ Copied fixture app');
        // Copy tarball to temp directory  
        const tarballPath = join(PROJECT_ROOT, tarballName);
        const targetTarball = join(tempDir, '..', tarballName);
        cpSync(tarballPath, targetTarball);
        console.log(`  ✓ Copied tarball to ${targetTarball}`);
        // Update package.json to point to the tarball
        const pkgJsonPath = join(tempDir, 'package.json');
        const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        pkgJson.dependencies.mkolbol = `file:${targetTarball}`;
        writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
        console.log('  ✓ Updated package.json with tarball path');
        // Step 4: Install dependencies
        console.log('\n[4/6] Installing dependencies...');
        exec('npm install', tempDir);
        console.log('  ✓ Installation successful');
        // Step 5: Verify installation
        console.log('\n[5/6] Verifying installation...');
        try {
            exec('node -e "import(\\"mkolbol\\").then(() => console.log(\\"✓ Import successful\\"))"', tempDir);
        }
        catch (err) {
            console.error('  ✗ Failed to import mkolbol');
            throw err;
        }
        // Step 6: Run the test
        console.log('\n[6/6] Running topology test...');
        const result = await execAsync('npm', ['test'], tempDir);
        if (result.code !== 0) {
            console.error(`\n❌ Test failed with exit code ${result.code}`);
            process.exit(1);
        }
        console.log('\n==========================================');
        console.log('✅ Consumer Acceptance Test PASSED');
        console.log('==========================================\n');
        // Clean up tarball
        console.log('Cleaning up...');
        rmSync(tarballPath, { force: true });
        rmSync(targetTarball, { force: true });
        rmSync(tempDir, { recursive: true, force: true });
        console.log('  ✓ Cleanup complete');
    }
    catch (error) {
        console.error('\n==========================================');
        console.error('❌ Consumer Acceptance Test FAILED');
        console.error('==========================================');
        console.error(error.message || error);
        // Clean up on failure
        rmSync(tempDir, { recursive: true, force: true });
        process.exit(1);
    }
}
main();
//# sourceMappingURL=test-consumer.js.map