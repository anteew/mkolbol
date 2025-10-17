import { createHash } from 'crypto';
import { createReadStream, existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
async function calculateFileHash(filepath) {
    const hash = createHash('sha256');
    const stream = createReadStream(filepath);
    for await (const chunk of stream) {
        hash.update(chunk);
    }
    return hash.digest('hex');
}
export async function packageHandler(_args) {
    const startTime = performance.now();
    try {
        const projectRoot = process.cwd();
        const distDir = join(projectRoot, 'dist');
        const bundleFile = join(distDir, 'bundle.js');
        const provenanceFile = join(distDir, 'build-info.json');
        // Verify required files exist
        if (!existsSync(bundleFile)) {
            console.error('Error: Bundle not found. Run `mk build` first.');
            return 1;
        }
        if (!existsSync(provenanceFile)) {
            console.error('Error: Build provenance not found. Run `mk build` first.');
            return 1;
        }
        // Read provenance for deterministic filename
        const provenance = JSON.parse(readFileSync(provenanceFile, 'utf-8'));
        const version = provenance.version || '0.0.0';
        const timestamp = new Date(provenance.timestamp).getTime();
        const platform = provenance.platform;
        const arch = provenance.arch;
        // Deterministic capsule filename
        const capsuleFilename = `mkolbol-${version}-${platform}-${arch}-${timestamp}.capsule.tgz`;
        const capsulePath = join(distDir, capsuleFilename);
        console.log('[mk package] Creating capsule...');
        // Create tarball using tar command
        const files = ['bundle.js', 'bundle.js.map', 'build-info.json'].filter((f) => existsSync(join(distDir, f)));
        await execAsync(`tar -czf "${capsuleFilename}" ${files.map((f) => `"${f}"`).join(' ')}`, {
            cwd: distDir,
        });
        // Get file stats
        const stats = statSync(capsulePath);
        const size = stats.size;
        const sizeFormatted = formatSize(size);
        // Calculate SHA256
        const sha256 = await calculateFileHash(capsulePath);
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
        console.log(`✓ Packaged: ${capsuleFilename} (${sizeFormatted}) in ${elapsed}s`);
        console.log(`  SHA256: ${sha256}`);
        return 0;
    }
    catch (error) {
        console.error(`Package failed: ${error instanceof Error ? error.message : String(error)}`);
        return 1;
    }
}
//# sourceMappingURL=package.js.map