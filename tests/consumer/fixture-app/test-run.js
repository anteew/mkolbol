#!/usr/bin/env node
import { Kernel, Hostess, StateManager, Executor } from 'mkolbol';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputFile = join(__dirname, 'test-output.jsonl');

async function runTest() {
  console.log('[Consumer Test] Starting topology test...');

  // Clean up previous output
  if (existsSync(outputFile)) {
    unlinkSync(outputFile);
  }

  // Read topology config
  const configPath = join(__dirname, 'topology.yml');
  const configYaml = readFileSync(configPath, 'utf8');
  const config = parseYaml(configYaml);

  // Create kernel, hostess, state manager, and executor
  const kernel = new Kernel();
  const hostess = new Hostess();
  const stateManager = new StateManager(kernel);
  const executor = new Executor(kernel, hostess, stateManager);
  
  let success = false;

  try {
    console.log('[Consumer Test] Loading topology...');
    executor.load(config);
    
    console.log('[Consumer Test] Starting topology...');
    await executor.up();

    // Wait for some output to be generated
    console.log('[Consumer Test] Running topology for 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if output file was created and has content
    if (existsSync(outputFile)) {
      const content = readFileSync(outputFile, 'utf8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);
      
      if (lines.length > 0) {
        console.log(`[Consumer Test] ✅ SUCCESS: Generated ${lines.length} events`);
        console.log(`[Consumer Test] Sample event: ${lines[0].substring(0, 100)}...`);
        success = true;
      } else {
        console.error('[Consumer Test] ❌ FAIL: Output file is empty');
      }
    } else {
      console.error('[Consumer Test] ❌ FAIL: Output file was not created');
    }

    await executor.down();
  } catch (error) {
    console.error('[Consumer Test] ❌ FAIL: Error during test:', error.message);
    process.exit(1);
  }

  if (!success) {
    process.exit(1);
  }

  console.log('[Consumer Test] Test completed successfully');
  process.exit(0);
}

runTest();
