import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
export async function runDoctorChecks(verbose = false) {
    const results = [];
    results.push(checkNodeVersion());
    results.push(checkPackageManager());
    results.push(checkGitRepository());
    results.push(checkBuildStatus());
    results.push(checkDependencies());
    results.push(checkTypeScriptCompilation());
    return results;
}
function checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (majorVersion >= 20) {
        return {
            name: 'Node.js version',
            status: 'pass',
            message: `${nodeVersion} (>= 20)`,
        };
    }
    else {
        return {
            name: 'Node.js version',
            status: 'fail',
            message: `${nodeVersion} (< 20)`,
            remediation: 'Install Node.js 20 or later from https://nodejs.org/ or use nvm: nvm install 20',
        };
    }
}
function checkPackageManager() {
    let npm = false;
    let pnpm = false;
    try {
        execSync('npm --version', { stdio: 'pipe' });
        npm = true;
    }
    catch {
        // npm not found
    }
    try {
        execSync('pnpm --version', { stdio: 'pipe' });
        pnpm = true;
    }
    catch {
        // pnpm not found
    }
    if (npm || pnpm) {
        const managers = [npm && 'npm', pnpm && 'pnpm'].filter(Boolean).join(', ');
        return {
            name: 'Package manager',
            status: 'pass',
            message: `Found: ${managers}`,
        };
    }
    else {
        return {
            name: 'Package manager',
            status: 'fail',
            message: 'npm/pnpm not found',
            remediation: 'Install npm (comes with Node.js) or pnpm: npm install -g pnpm',
        };
    }
}
function checkGitRepository() {
    try {
        execSync('git rev-parse --git-dir', { stdio: 'pipe' });
        return {
            name: 'Git repository',
            status: 'pass',
            message: 'Detected',
        };
    }
    catch {
        return {
            name: 'Git repository',
            status: 'warn',
            message: 'Not a git repository',
            remediation: 'Initialize git: git init',
        };
    }
}
function checkBuildStatus() {
    const distPath = resolve(process.cwd(), 'dist');
    if (existsSync(distPath)) {
        const mkPath = resolve(distPath, 'scripts/mk.js');
        const hasMk = existsSync(mkPath);
        if (hasMk) {
            return {
                name: 'Build status',
                status: 'pass',
                message: 'dist/ directory exists with compiled files',
            };
        }
        else {
            return {
                name: 'Build status',
                status: 'warn',
                message: 'dist/ exists but incomplete',
                remediation: 'Run: npm run build',
            };
        }
    }
    else {
        return {
            name: 'Build status',
            status: 'fail',
            message: 'dist/ directory not found',
            remediation: 'Run: npm run build',
        };
    }
}
function checkDependencies() {
    const nodeModulesPath = resolve(process.cwd(), 'node_modules');
    if (existsSync(nodeModulesPath)) {
        return {
            name: 'Dependencies',
            status: 'pass',
            message: 'node_modules/ directory exists',
        };
    }
    else {
        return {
            name: 'Dependencies',
            status: 'fail',
            message: 'node_modules/ not found',
            remediation: 'Run: npm install',
        };
    }
}
function checkTypeScriptCompilation() {
    try {
        execSync('npx tsc --version', { stdio: 'pipe' });
        try {
            execSync('npx tsc --noEmit', { stdio: 'pipe', timeout: 10000 });
            return {
                name: 'TypeScript compilation',
                status: 'pass',
                message: 'No type errors',
            };
        }
        catch {
            return {
                name: 'TypeScript compilation',
                status: 'warn',
                message: 'Type errors detected',
                remediation: 'Run: npx tsc --noEmit to see errors',
            };
        }
    }
    catch {
        return {
            name: 'TypeScript compilation',
            status: 'fail',
            message: 'TypeScript not found',
            remediation: 'Run: npm install',
        };
    }
}
export function formatCheckResults(results) {
    const lines = [];
    lines.push('\n🏥 mk doctor — Environment Diagnostics\n');
    for (const result of results) {
        const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
        const statusColor = result.status === 'pass' ? '' : result.status === 'warn' ? ' (warning)' : ' (failed)';
        lines.push(`${icon} ${result.name}: ${result.message}${statusColor}`);
        if (result.remediation) {
            lines.push(`  → ${result.remediation}`);
        }
    }
    const passCount = results.filter(r => r.status === 'pass').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    lines.push('\n' + '─'.repeat(60));
    lines.push(`Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
    if (failCount === 0 && warnCount === 0) {
        lines.push('✓ All checks passed!');
    }
    else if (failCount > 0) {
        lines.push('✗ Some checks failed. See remediations above.');
    }
    else {
        lines.push('⚠ Some warnings detected. Review and fix if needed.');
    }
    return lines.join('\n');
}
//# sourceMappingURL=doctor.js.map