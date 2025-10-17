import { mkdir, writeFile, readFile, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
export async function bootstrapProject(appDir, options = {}) {
    const { yes = false, verbose = false, template = 'hello-calculator', source = 'local', gitTag, tarballPath, } = options;
    const targetDir = resolve(process.cwd(), appDir);
    const projectName = appDir.split('/').pop() || appDir;
    if (existsSync(targetDir)) {
        throw new Error(`Directory '${appDir}' already exists. Please choose a different name or remove the existing directory.`);
    }
    if (verbose) {
        console.log(`[bootstrap] Creating project in: ${targetDir}`);
        console.log(`[bootstrap] Template: ${template}`);
        console.log(`[bootstrap] Source: ${source}`);
    }
    const repoRoot = locateRepoRoot();
    const templatesDir = join(repoRoot, 'examples/mk/init-templates');
    const templatePath = join(templatesDir, template);
    if (!existsSync(templatePath)) {
        throw new Error(`Template '${template}' not found at ${templatePath}`);
    }
    await mkdir(targetDir, { recursive: true });
    if (verbose) {
        console.log(`[bootstrap] Copying template from: ${templatePath}`);
    }
    await cp(templatePath, targetDir, { recursive: true });
    await updatePackageJson(targetDir, projectName, source, {
        verbose,
        gitTag,
        tarballPath,
        repoRoot,
    });
    await updateReadme(targetDir, appDir);
    await installDependencies(targetDir, { yes, verbose });
    console.log(`\n✓ Project '${appDir}' bootstrapped successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${appDir}`);
    console.log(`  npm run build`);
    console.log(`  npm run test`);
    console.log(`  npx mk run mk.json --dry-run`);
}
async function updatePackageJson(targetDir, projectName, source, opts) {
    const pkgPath = join(targetDir, 'package.json');
    const pkgContent = await readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent);
    pkg.name = projectName;
    let mkolbolDependency;
    if (source === 'tarball') {
        if (opts.tarballPath) {
            mkolbolDependency = opts.tarballPath;
        }
        else {
            const tarballs = (await readdir(opts.repoRoot)).filter((f) => /^mkolbol-.*\.tgz$/.test(f));
            if (tarballs.length === 0) {
                throw new Error('No mkolbol tarball found. Run `npm pack` in the mkolbol repo first.');
            }
            mkolbolDependency = resolve(opts.repoRoot, tarballs[0]);
        }
        if (opts.verbose) {
            console.log(`[bootstrap] Using tarball: ${mkolbolDependency}`);
        }
    }
    else if (source === 'git') {
        const tag = opts.gitTag || 'main';
        mkolbolDependency = `github:anteew/mkolbol#${tag}`;
        if (opts.verbose) {
            console.log(`[bootstrap] Using git reference: ${mkolbolDependency}`);
        }
    }
    else {
        mkolbolDependency = opts.repoRoot;
        if (opts.verbose) {
            console.log(`[bootstrap] Using local path: ${mkolbolDependency}`);
        }
    }
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies.mkolbol = mkolbolDependency;
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    if (opts.verbose) {
        console.log(`[bootstrap] Updated package.json with mkolbol dependency`);
    }
}
async function updateReadme(targetDir, projectName) {
    const readmePath = join(targetDir, 'README.md');
    if (existsSync(readmePath)) {
        const content = await readFile(readmePath, 'utf8');
        const updated = content
            .replace(/hello-calculator/gi, projectName)
            .replace(/\(\.\.\/\.\.\//g, '(../../node_modules/mkolbol/');
        await writeFile(readmePath, updated);
    }
}
async function installDependencies(targetDir, opts) {
    if (!opts.yes) {
        return;
    }
    console.log('\nInstalling dependencies...');
    await new Promise((resolve, reject) => {
        const npmInstall = spawn('npm', ['install'], {
            cwd: targetDir,
            stdio: opts.verbose ? 'inherit' : 'pipe',
        });
        npmInstall.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`npm install failed with code ${code}`));
            }
        });
        npmInstall.on('error', (err) => {
            reject(err);
        });
    });
    console.log('✓ Dependencies installed');
}
export async function listTemplates() {
    const repoRoot = locateRepoRoot();
    const templatesDir = join(repoRoot, 'examples/mk/init-templates');
    if (!existsSync(templatesDir)) {
        return [];
    }
    const entries = await readdir(templatesDir, { withFileTypes: true });
    const templates = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const pkgPath = join(templatesDir, entry.name, 'package.json');
            if (existsSync(pkgPath)) {
                const pkgContent = await readFile(pkgPath, 'utf8');
                const pkg = JSON.parse(pkgContent);
                templates.push({
                    name: entry.name,
                    description: pkg.description || 'No description',
                    dependencies: pkg.dependencies,
                    scripts: pkg.scripts,
                });
            }
        }
    }
    return templates;
}
function locateRepoRoot() {
    // 1) Prefer current working directory (tests and CLI typically run from repo root)
    const cwd = resolve(process.cwd());
    if (existsSync(join(cwd, 'examples/mk/init-templates')))
        return cwd;
    // 2) Fall back to path relative to this source file
    try {
        const thisFile = fileURLToPath(import.meta.url);
        const srcDir = dirname(thisFile);
        const candidate = resolve(srcDir, '../../..');
        if (existsSync(join(candidate, 'examples/mk/init-templates')))
            return candidate;
    }
    catch {
        // ignore
    }
    // 3) As a last resort, return cwd
    return cwd;
}
//# sourceMappingURL=bootstrap.js.map