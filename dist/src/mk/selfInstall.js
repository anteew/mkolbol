import { existsSync, mkdirSync, writeFileSync, unlinkSync, copyFileSync, chmodSync, statSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';
import { execSync } from 'node:child_process';
function getRepoRoot() {
    const currentFile = fileURLToPath(import.meta.url);
    return resolve(dirname(currentFile), '../../..');
}
function getMkEntryPoint(from) {
    if (from === 'repo') {
        return resolve(getRepoRoot(), 'dist/scripts/mk.js');
    }
    else {
        try {
            const globalPath = execSync('npm root -g', { encoding: 'utf8' }).trim();
            return resolve(globalPath, 'mkolbol/dist/scripts/mk.js');
        }
        catch {
            throw new Error('Could not locate global mkolbol installation. Run: npm install -g mkolbol');
        }
    }
}
function createUnixShim(targetScript, shimPath, copy) {
    if (copy) {
        copyFileSync(targetScript, shimPath);
        chmodSync(shimPath, 0o755);
    }
    else {
        const shimContent = `#!/usr/bin/env bash\nexec node "${targetScript}" "$@"\n`;
        writeFileSync(shimPath, shimContent, { mode: 0o755 });
    }
}
function createWindowsShim(targetScript, shimPath) {
    const cmdContent = `@echo off\nnode "${targetScript}" %*\n`;
    writeFileSync(shimPath + '.cmd', cmdContent, { mode: 0o755 });
}
export function install(options) {
    try {
        const { binDir, from, copy = false, verbose = false } = options;
        const absBinDir = isAbsolute(binDir) ? binDir : resolve(process.cwd(), binDir);
        if (!existsSync(absBinDir)) {
            mkdirSync(absBinDir, { recursive: true });
            if (verbose) {
                console.log(`Created directory: ${absBinDir}`);
            }
        }
        const mkScript = getMkEntryPoint(from);
        if (!existsSync(mkScript)) {
            return {
                success: false,
                message: `Entry point not found: ${mkScript}. Run 'npm run build' first.`,
            };
        }
        const shimPaths = [];
        const isWindows = platform() === 'win32';
        const mkShimPath = resolve(absBinDir, 'mk');
        createUnixShim(mkScript, mkShimPath, copy);
        shimPaths.push(mkShimPath);
        if (isWindows) {
            createWindowsShim(mkScript, mkShimPath);
            shimPaths.push(mkShimPath + '.cmd');
        }
        if (verbose) {
            shimPaths.forEach(p => console.log(`Created shim: ${p}`));
        }
        return {
            success: true,
            message: `✓ Installed mk to ${absBinDir}`,
            shimPaths,
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
export function uninstall(binDir) {
    try {
        const absBinDir = isAbsolute(binDir) ? binDir : resolve(process.cwd(), binDir);
        const shimNames = ['mk', 'mk.cmd'];
        const removedPaths = [];
        for (const name of shimNames) {
            const shimPath = resolve(absBinDir, name);
            if (existsSync(shimPath)) {
                unlinkSync(shimPath);
                removedPaths.push(shimPath);
            }
        }
        if (removedPaths.length === 0) {
            return {
                success: false,
                message: `No mk shims found in ${absBinDir}`,
            };
        }
        return {
            success: true,
            message: `✓ Removed ${removedPaths.length} shim(s) from ${absBinDir}`,
            shimPaths: removedPaths,
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Uninstall failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
export function where() {
    try {
        const paths = (process.env.PATH || '').split(platform() === 'win32' ? ';' : ':');
        const foundInstalls = [];
        for (const dir of paths) {
            if (!dir || !existsSync(dir))
                continue;
            const mkPath = resolve(dir, 'mk');
            const mkCmdPath = resolve(dir, 'mk.cmd');
            if (existsSync(mkPath)) {
                try {
                    const stats = statSync(mkPath);
                    if (stats.isFile() || stats.isSymbolicLink()) {
                        foundInstalls.push(mkPath);
                    }
                }
                catch {
                    // Skip inaccessible files
                }
            }
            if (platform() === 'win32' && existsSync(mkCmdPath)) {
                foundInstalls.push(mkCmdPath);
            }
        }
        if (foundInstalls.length === 0) {
            return {
                success: false,
                message: 'No mk installations found in PATH',
            };
        }
        return {
            success: true,
            message: `Found ${foundInstalls.length} installation(s):\n` + foundInstalls.map(p => `  ${p}`).join('\n'),
            shimPaths: foundInstalls,
        };
    }
    catch (error) {
        return {
            success: false,
            message: `where failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
export function switchVersion(version) {
    try {
        execSync(`npm install -g mkolbol@${version}`, { stdio: 'inherit' });
        return {
            success: true,
            message: `✓ Switched to mkolbol@${version}`,
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Version switch failed: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
//# sourceMappingURL=selfInstall.js.map