import { build as esbuild } from 'esbuild';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { readFileSync, existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BuildProvenance {
  version: string;
  timestamp: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  bundler: string;
  entryPoint: string;
  outputFile: string;
  sourceFiles: string[];
  bundleHash: string;
}

export async function buildHandler(_args: string[]): Promise<number> {
  const startTime = performance.now();

  try {
    const projectRoot = process.cwd();
    const distDir = join(projectRoot, 'dist');
    const outfile = join(distDir, 'bundle.js');
    const provenanceFile = join(distDir, 'build-info.json');

    // Ensure dist directory exists
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    // Read package.json for version
    const pkgPath = join(projectRoot, 'package.json');
    const pkg = existsSync(pkgPath)
      ? JSON.parse(readFileSync(pkgPath, 'utf-8'))
      : { version: '0.0.0' };

    // Default entry point
    const entryPoint = join(projectRoot, 'src/index.ts');

    if (!existsSync(entryPoint)) {
      console.error(`Error: Entry point not found: ${entryPoint}`);
      return 1;
    }

    console.log('[mk build] Bundling with esbuild...');

    // Build with esbuild
    const result = await esbuild({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile,
      external: ['node-pty', 'yaml'],
      sourcemap: true,
      metafile: true,
      minify: false,
      treeShaking: true,
    });

    // Calculate bundle hash
    const bundleContent = readFileSync(outfile, 'utf-8');
    const bundleHash = createHash('sha256').update(bundleContent).digest('hex');

    // Extract source files from metafile
    const sourceFiles = result.metafile ? Object.keys(result.metafile.inputs).sort() : [entryPoint];

    // Generate provenance
    const provenance: BuildProvenance = {
      version: pkg.version,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      bundler: 'esbuild',
      entryPoint,
      outputFile: outfile,
      sourceFiles,
      bundleHash,
    };

    // Write provenance
    writeFileSync(provenanceFile, JSON.stringify(provenance, null, 2));

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

    console.log(`✓ Built in ${elapsed}s, provenance at dist/build-info.json`);

    return 0;
  } catch (error) {
    console.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
