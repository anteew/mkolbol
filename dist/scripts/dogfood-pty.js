#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}
function runCommand(cmd, options = {}) {
    console.log(`> ${cmd}`);
    try {
        return execSync(cmd, {
            encoding: 'utf8',
            stdio: ['inherit', 'pipe', 'inherit'],
            ...options
        });
    }
    catch (error) {
        return error.stdout || '';
    }
}
function main() {
    const reportsDir = path.resolve('reports');
    const feedbackDir = path.resolve('project-manager/laminar-feedback');
    ensureDir(reportsDir);
    ensureDir(feedbackDir);
    console.log('=== Laminar Dogfood PTY (Forks Lane) ===\n');
    // 1. Run tests with Laminar (forks lane)
    console.log('Step 1: Running test:pty (forks lane)...');
    runCommand('MK_PROCESS_EXPERIMENTAL=1 npm run test:pty');
    // 2. Generate summary
    console.log('\nStep 2: Generating summary...');
    const summary = runCommand('npm run lam -- summary');
    fs.writeFileSync(path.join(reportsDir, 'LAMINAR_SUMMARY.txt'), summary, 'utf8');
    // 3. Generate trends if history exists
    console.log('\nStep 3: Generating trends...');
    const trends = runCommand('npm run lam -- trends --top 10');
    fs.writeFileSync(path.join(reportsDir, 'LAMINAR_TRENDS.txt'), trends, 'utf8');
    // 4. Generate digest for failures (if any)
    console.log('\nStep 4: Generating digest for failures...');
    const indexPath = path.join(reportsDir, 'index.json');
    if (fs.existsSync(indexPath)) {
        try {
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            const hasFailures = Array.isArray(index?.artifacts) &&
                index.artifacts.some((a) => a.status === 'fail');
            if (hasFailures) {
                const digest = runCommand('npm run lam -- digest');
                fs.writeFileSync(path.join(reportsDir, 'LAMINAR_DIGEST.txt'), digest, 'utf8');
            }
            else {
                console.log('No failures detected, skipping digest.');
            }
        }
        catch (err) {
            console.log('Could not read index.json for digest check:', err);
        }
    }
    // 5. Generate feedback markdown
    console.log('\nStep 5: Generating feedback markdown...');
    runCommand('tsx scripts/laminar-feedback.ts');
    // 6. Save PTY-specific feedback to reports/LAMINAR_PTY_FEEDBACK.txt
    const latestFeedback = path.join(feedbackDir, 'latest.md');
    if (fs.existsSync(latestFeedback)) {
        const feedbackContent = fs.readFileSync(latestFeedback, 'utf8');
        const ptyFeedback = feedbackContent.replace('# Laminar Dogfooding Feedback', '# Laminar PTY/Forks Lane Dogfooding Feedback');
        fs.writeFileSync(path.join(reportsDir, 'LAMINAR_PTY_FEEDBACK.txt'), ptyFeedback, 'utf8');
    }
    console.log('\n✅ Dogfood PTY complete!');
    console.log(`   - Summary: ${path.join(reportsDir, 'LAMINAR_SUMMARY.txt')}`);
    console.log(`   - Trends: ${path.join(reportsDir, 'LAMINAR_TRENDS.txt')}`);
    console.log(`   - PTY Feedback: ${path.join(reportsDir, 'LAMINAR_PTY_FEEDBACK.txt')}`);
    console.log(`   - Latest: ${path.join(feedbackDir, 'latest.md')}`);
}
main();
//# sourceMappingURL=dogfood-pty.js.map