import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, access, constants as fsConstants } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { execSync } from 'node:child_process';
import https from 'node:https';
const GITHUB_OWNER = 'anteew';
const GITHUB_REPO = 'mkolbol';
export async function downloadRelease(tag) {
    const tarballUrl = await getReleaseTarballUrl(tag);
    const fileName = `mkolbol-${tag}.tgz`;
    const outputPath = join(process.cwd(), fileName);
    await downloadFile(tarballUrl, outputPath);
    return outputPath;
}
export async function installTarball(tarballPath) {
    if (!existsSync(tarballPath)) {
        throw new Error(`Tarball not found: ${tarballPath}`);
    }
    try {
        await access(tarballPath, fsConstants.R_OK);
    }
    catch {
        throw new Error(`Cannot read tarball: ${tarballPath}`);
    }
    console.log(`Installing from ${tarballPath}...`);
    try {
        execSync(`npm install "${tarballPath}"`, {
            stdio: 'inherit',
            cwd: process.cwd(),
        });
        console.log('Installation complete');
    }
    catch (error) {
        throw new Error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function getReleaseTarballUrl(tag) {
    const normalizedTag = tag === 'latest' ? await getLatestReleaseTag() : tag;
    return new Promise((resolve, reject) => {
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${normalizedTag}`;
        https.get(apiUrl, {
            headers: {
                'User-Agent': 'mkolbol-fetch',
                'Accept': 'application/vnd.github+json',
            },
        }, (res) => {
            if (res.statusCode === 404) {
                reject(new Error(`Release ${normalizedTag} not found`));
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`GitHub API returned status ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const tgzAsset = release.assets?.find((asset) => asset.name.endsWith('.tgz') || asset.name.endsWith('.tar.gz'));
                    if (!tgzAsset) {
                        reject(new Error(`No .tgz asset found for release ${normalizedTag}`));
                        return;
                    }
                    resolve(tgzAsset.browser_download_url);
                }
                catch (error) {
                    reject(new Error(`Failed to parse release data: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
        }).on('error', reject);
    });
}
async function getLatestReleaseTag() {
    return new Promise((resolve, reject) => {
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
        https.get(apiUrl, {
            headers: {
                'User-Agent': 'mkolbol-fetch',
                'Accept': 'application/vnd.github+json',
            },
        }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch latest release: status ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    resolve(release.tag_name);
                }
                catch (error) {
                    reject(new Error(`Failed to parse latest release: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
        }).on('error', reject);
    });
}
async function downloadFile(url, outputPath) {
    const dir = dirname(outputPath);
    await mkdir(dir, { recursive: true });
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'mkolbol-fetch',
            },
        }, async (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                if (res.headers.location) {
                    await downloadFile(res.headers.location, outputPath);
                    resolve();
                }
                else {
                    reject(new Error('Redirect without location header'));
                }
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Download failed with status ${res.statusCode}`));
                return;
            }
            const fileStream = createWriteStream(outputPath);
            try {
                await pipeline(res, fileStream);
                console.log(`Downloaded to ${outputPath}`);
                resolve();
            }
            catch (error) {
                reject(new Error(`Download failed: ${error instanceof Error ? error.message : String(error)}`));
            }
        }).on('error', reject);
    });
}
//# sourceMappingURL=fetch.js.map