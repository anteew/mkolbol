#!/usr/bin/env node

/**
 * build-bundle.mjs
 *
 * Example bundling script for mkolbol applications using esbuild.
 * This creates a single JavaScript bundle from your TypeScript source,
 * including the mkolbol kernel and all JavaScript dependencies.
 *
 * Usage:
 *   node scripts/build-bundle.mjs
 *
 * Or via npm:
 *   npm run build:bundle
 */

import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Configuration
const config = {
  // Entry point: your main application file
  // CUSTOMIZE: Change this to your application's entry point
  entryPoints: [join(rootDir, 'src/index.ts')],

  // Output: bundled file location
  // CUSTOMIZE: Change output location if needed
  outfile: join(rootDir, 'dist/runner.js'),

  // Bundle all dependencies into a single file
  bundle: true,

  // Target Node.js platform (not browser)
  platform: 'node',

  // Target Node.js version 20 or higher
  target: 'node20',

  // Use ES modules (matches mkolbol's architecture)
  format: 'esm',

  // External packages (not bundled)
  // IMPORTANT: Native modules like node-pty must be external
  // Add any other native modules or large dependencies here
  external: [
    'node-pty',      // Native PTY module (must be installed separately)
    'fsevents',      // macOS file watching (optional, platform-specific)
    // CUSTOMIZE: Add other externals as needed:
    // 'yaml',       // Uncomment to keep yaml external (smaller bundle, but requires npm install)
  ],

  // Enable source maps for debugging
  // Options: 'linked', 'inline', 'external', or false
  sourcemap: 'linked',

  // Minify output (reduces size, harder to debug)
  // Set to true for production builds
  minify: false,

  // Preserve function and class names (better stack traces)
  keepNames: true,

  // Tree-shake unused code
  treeShaking: true,

  // Logging
  logLevel: 'info',
};

async function build() {
  console.log('Building mkolbol application bundle...\n');
  console.log('Configuration:');
  console.log('  Entry:', config.entryPoints[0]);
  console.log('  Output:', config.outfile);
  console.log('  External:', config.external.join(', '));
  console.log('  Minify:', config.minify);
  console.log('  Source maps:', config.sourcemap);
  console.log('');

  try {
    const result = await esbuild.build(config);

    console.log('\nBuild completed successfully!');
    console.log('\nBundle info:');

    if (result.metafile) {
      const outputs = Object.keys(result.metafile.outputs);
      for (const output of outputs) {
        const info = result.metafile.outputs[output];
        const sizeKB = (info.bytes / 1024).toFixed(2);
        console.log(`  ${output}: ${sizeKB} KB`);
      }
    }

    console.log('\nTo run the bundled application:');
    console.log(`  node ${config.outfile}`);
    console.log('\nOr via npm:');
    console.log('  npm run start:bundle');
    console.log('\nIMPORTANT: External dependencies must be installed:');
    console.log('  npm install node-pty');

  } catch (error) {
    console.error('\nBuild failed:', error);
    process.exit(1);
  }
}

// Advanced Configuration Examples
// -------------------------------

/**
 * Example 1: Production build with minification
 *
 * const productionConfig = {
 *   ...config,
 *   minify: true,
 *   sourcemap: false,
 *   keepNames: false,
 *   logLevel: 'warning',
 * };
 */

/**
 * Example 2: Code splitting (for very large apps)
 *
 * const splittingConfig = {
 *   ...config,
 *   outfile: undefined,  // Remove outfile when using splitting
 *   outdir: join(rootDir, 'dist'),
 *   splitting: true,
 *   format: 'esm',  // Required for splitting
 * };
 */

/**
 * Example 3: Custom define (environment variables at build time)
 *
 * const defineConfig = {
 *   ...config,
 *   define: {
 *     'process.env.NODE_ENV': '"production"',
 *     'process.env.VERSION': '"1.0.0"',
 *   },
 * };
 */

/**
 * Example 4: Bundle with metafile (for analysis)
 *
 * const analyzeConfig = {
 *   ...config,
 *   metafile: true,
 * };
 *
 * // After build:
 * // import { writeFileSync } from 'fs';
 * // writeFileSync('meta.json', JSON.stringify(result.metafile));
 * // Then analyze with: npx esbuild-analyzer meta.json
 */

/**
 * Example 5: Watch mode (rebuild on file changes)
 *
 * const watchConfig = {
 *   ...config,
 *   // In build function:
 *   // const ctx = await esbuild.context(watchConfig);
 *   // await ctx.watch();
 *   // console.log('Watching for changes...');
 * };
 */

// Entry point loading patterns
// -----------------------------

/**
 * How to structure your entry point (src/index.ts):
 *
 * import { Kernel, Hostess, StateManager, Executor } from 'mkolbol';
 * import { readFileSync } from 'fs';
 * import { join, dirname } from 'path';
 * import { fileURLToPath } from 'url';
 *
 * // Get bundle directory
 * const __filename = fileURLToPath(import.meta.url);
 * const __dirname = dirname(__filename);
 *
 * async function main() {
 *   // Load configuration from file system
 *   const configPath = process.env.CONFIG_PATH ||
 *                      join(__dirname, '../config/topology.yml');
 *
 *   const config = readFileSync(configPath, 'utf-8');
 *
 *   // Initialize kernel
 *   const kernel = new Kernel();
 *   const hostess = new Hostess();
 *   const stateManager = new StateManager(kernel);
 *   const executor = new Executor(kernel, hostess, stateManager);
 *
 *   // Load and start topology
 *   executor.load(JSON.parse(config));
 *   await executor.up();
 *
 *   console.log('mkolbol application started');
 * }
 *
 * main().catch(console.error);
 */

// Run the build
build();
