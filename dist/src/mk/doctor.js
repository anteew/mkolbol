import { execSync } from 'node:child_process';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export async function runDoctorChecks(verbose = false, section = 'all') {
    const results = [];
    if (section === 'all' || section === 'environment') {
        results.push(checkNodeVersion());
        results.push(checkPackageManager());
        results.push(checkGitRepository());
        results.push(checkBuildStatus());
        results.push(checkDependencies());
        results.push(checkTypeScriptCompilation());
    }
    if (section === 'all' || section === 'toolchain') {
        results.push(checkToolchainPath());
        results.push(checkShimIntegrity());
        results.push(checkMkVersionConsistency());
        results.push(checkBinaryAccessibility());
    }
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
function checkToolchainPath() {
    const mkBins = ['mk', 'mkctl', 'lam'];
    const foundBins = [];
    for (const bin of mkBins) {
        try {
            const result = execSync(`which ${bin}`, { stdio: 'pipe', encoding: 'utf8' }).trim();
            if (result)
                foundBins.push(bin);
        }
        catch {
            // Not found in PATH
        }
    }
    if (foundBins.length === mkBins.length) {
        return {
            name: 'Toolchain PATH',
            status: 'pass',
            message: `All binaries found: ${foundBins.join(', ')}`,
        };
    }
    else if (foundBins.length > 0) {
        const missing = mkBins.filter(b => !foundBins.includes(b));
        return {
            name: 'Toolchain PATH',
            status: 'warn',
            message: `Found: ${foundBins.join(', ')}. Missing: ${missing.join(', ')}`,
            remediation: 'Run: npm install -g . or mk self-install',
        };
    }
    else {
        return {
            name: 'Toolchain PATH',
            status: 'fail',
            message: 'No mkolbol binaries found in PATH',
            remediation: 'Run: npm install -g . or mk self-install --wrapper-only',
        };
    }
}
function checkShimIntegrity() {
    const distBins = [
        { name: 'mk', path: 'dist/scripts/mk.js' },
        { name: 'mkctl', path: 'dist/scripts/mkctl.js' },
        { name: 'lam', path: 'dist/scripts/lam.js' },
    ];
    const issues = [];
    const ok = [];
    for (const bin of distBins) {
        const fullPath = resolve(process.cwd(), bin.path);
        if (!existsSync(fullPath)) {
            issues.push(`${bin.name}: file missing`);
        }
        else {
            try {
                const stats = statSync(fullPath);
                if (!stats.isFile()) {
                    issues.push(`${bin.name}: not a file`);
                }
                else if (!(stats.mode & 0o111)) {
                    issues.push(`${bin.name}: not executable`);
                }
                else {
                    ok.push(bin.name);
                }
            }
            catch {
                issues.push(`${bin.name}: stat failed`);
            }
        }
    }
    if (issues.length === 0) {
        return {
            name: 'Shim integrity',
            status: 'pass',
            message: `All ${ok.length} shims OK`,
        };
    }
    else if (ok.length > 0) {
        return {
            name: 'Shim integrity',
            status: 'warn',
            message: `Issues: ${issues.join(', ')}`,
            remediation: 'Run: npm run build',
        };
    }
    else {
        return {
            name: 'Shim integrity',
            status: 'fail',
            message: 'All shims missing or broken',
            remediation: 'Run: npm run build',
        };
    }
}
function checkMkVersionConsistency() {
    try {
        const pkgJsonPath = resolve(process.cwd(), 'package.json');
        if (!existsSync(pkgJsonPath)) {
            return {
                name: 'mk version consistency',
                status: 'warn',
                message: 'package.json not found',
            };
        }
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
        const pkgVersion = pkg.version;
        let binVersion = null;
        try {
            const mkBinPath = resolve(process.cwd(), 'dist/scripts/mk.js');
            if (existsSync(mkBinPath)) {
                binVersion = execSync('node dist/scripts/mk.js --version', { stdio: 'pipe', encoding: 'utf8' }).trim();
            }
        }
        catch {
            // Binary version check failed
        }
        if (!binVersion) {
            return {
                name: 'mk version consistency',
                status: 'warn',
                message: 'Could not determine binary version',
                remediation: 'Run: npm run build',
            };
        }
        if (binVersion === pkgVersion) {
            return {
                name: 'mk version consistency',
                status: 'pass',
                message: `v${pkgVersion}`,
            };
        }
        else {
            return {
                name: 'mk version consistency',
                status: 'warn',
                message: `Mismatch: package.json=${pkgVersion}, binary=${binVersion}`,
                remediation: 'Run: npm run build',
            };
        }
    }
    catch (error) {
        return {
            name: 'mk version consistency',
            status: 'fail',
            message: 'Version check failed',
            remediation: 'Ensure package.json and dist/ exist',
        };
    }
}
function checkBinaryAccessibility() {
    const bins = ['mk', 'mkctl', 'lam'];
    const accessible = [];
    const inaccessible = [];
    for (const bin of bins) {
        const localPath = resolve(process.cwd(), `dist/scripts/${bin}.js`);
        if (existsSync(localPath)) {
            try {
                execSync(`node ${localPath} --version`, { stdio: 'pipe', timeout: 5000 });
                accessible.push(bin);
            }
            catch {
                inaccessible.push(bin);
            }
        }
        else {
            inaccessible.push(bin);
        }
    }
    if (accessible.length === bins.length) {
        return {
            name: 'Binary accessibility',
            status: 'pass',
            message: 'All binaries executable',
        };
    }
    else if (accessible.length > 0) {
        return {
            name: 'Binary accessibility',
            status: 'warn',
            message: `OK: ${accessible.join(', ')}. Failed: ${inaccessible.join(', ')}`,
            remediation: 'Run: npm run build',
        };
    }
    else {
        return {
            name: 'Binary accessibility',
            status: 'fail',
            message: 'No binaries accessible',
            remediation: 'Run: npm run build',
        };
    }
}
export function formatCheckResults(results, format = 'text') {
    if (format === 'json') {
        const passCount = results.filter(r => r.status === 'pass').length;
        const warnCount = results.filter(r => r.status === 'warn').length;
        const failCount = results.filter(r => r.status === 'fail').length;
        return JSON.stringify({
            summary: {
                total: results.length,
                passed: passCount,
                warnings: warnCount,
                failed: failCount,
            },
            checks: results,
        }, null, 2);
    }
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