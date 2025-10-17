import { createWriteStream, existsSync, createReadStream } from 'node:fs';
import { mkdir, chmod, access, constants as fsConstants, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import https from 'node:https';
import crypto from 'node:crypto';

const GITHUB_OWNER = 'anteew';
const GITHUB_REPO = 'mkolbol';

export interface FetchOptions {
  verify?: boolean;
  forceDownload?: boolean;
}

export async function downloadRelease(tag: string, options: FetchOptions = {}): Promise<string> {
  const normalizedTag = tag === 'latest' ? await getLatestReleaseTag() : tag;
  const cacheDir = join(homedir(), '.mk', 'toolchains', normalizedTag);
  const cachedPath = join(cacheDir, 'mkolbol.tgz');
  const hashPath = join(cacheDir, 'mkolbol.tgz.sha256');

  if (existsSync(cachedPath) && !options.forceDownload) {
    console.log(`Using cached tarball: ${cachedPath}`);
    
    if (options.verify) {
      const isValid = await verifyTarball(cachedPath, hashPath);
      if (!isValid) {
        throw new Error('SHA-256 verification failed for cached tarball');
      }
      console.log('✓ SHA-256 verification passed');
    }
    
    return cachedPath;
  }

  const { tarballUrl, sha256 } = await getReleaseTarballInfo(normalizedTag);
  
  await mkdir(cacheDir, { recursive: true });
  await downloadFile(tarballUrl, cachedPath);
  
  if (sha256) {
    await createReadStream(cachedPath)
      .pipe(createWriteStream(hashPath));
    
    const hashContent = sha256 + '\n';
    await writeFile(hashPath, hashContent);
    console.log(`✓ SHA-256 hash saved: ${sha256.slice(0, 16)}...`);
  } else {
    console.warn('⚠ No SHA-256 hash available from GitHub release');
  }

  if (options.verify) {
    const isValid = await verifyTarball(cachedPath, hashPath);
    if (!isValid) {
      throw new Error('SHA-256 verification failed');
    }
    console.log('✓ SHA-256 verification passed');
  }

  return cachedPath;
}

export async function verifyTarball(tarballPath: string, hashPath: string): Promise<boolean> {
  if (!existsSync(hashPath)) {
    console.warn('⚠ No hash file found for verification');
    return false;
  }

  const expectedHash = (await readFile(hashPath, 'utf8')).trim();
  const actualHash = await calculateSHA256(tarballPath);
  
  return expectedHash === actualHash;
}

export async function calculateSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function installTarball(tarballPath: string): Promise<void> {
  if (!existsSync(tarballPath)) {
    throw new Error(`Tarball not found: ${tarballPath}`);
  }

  try {
    await access(tarballPath, fsConstants.R_OK);
  } catch {
    throw new Error(`Cannot read tarball: ${tarballPath}`);
  }

  console.log(`Installing from ${tarballPath}...`);
  
  try {
    execSync(`npm install "${tarballPath}"`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('Installation complete');
  } catch (error) {
    throw new Error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getReleaseTarballInfo(tag: string): Promise<{ tarballUrl: string; sha256?: string }> {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${tag}`;
    
    https.get(apiUrl, {
      headers: {
        'User-Agent': 'mkolbol-fetch',
        'Accept': 'application/vnd.github+json',
      },
    }, (res) => {
      if (res.statusCode === 404) {
        reject(new Error(`Release ${tag} not found`));
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
          const tgzAsset = release.assets?.find((asset: any) => 
            asset.name.endsWith('.tgz') || asset.name.endsWith('.tar.gz')
          );

          if (!tgzAsset) {
            reject(new Error(`No .tgz asset found for release ${tag}`));
            return;
          }

          const sha256Asset = release.assets?.find((asset: any) => 
            asset.name === `${tgzAsset.name}.sha256` || asset.name.endsWith('.sha256')
          );

          resolve({
            tarballUrl: tgzAsset.browser_download_url,
            sha256: sha256Asset?.browser_download_url,
          });
        } catch (error) {
          reject(new Error(`Failed to parse release data: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    }).on('error', reject);
  });
}

async function getLatestReleaseTag(): Promise<string> {
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
        } catch (error) {
          reject(new Error(`Failed to parse latest release: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    }).on('error', reject);
  });
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
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
        } else {
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
      } catch (error) {
        reject(new Error(`Download failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    }).on('error', reject);
  });
}

async function writeFile(path: string, content: string): Promise<void> {
  const { writeFile: fsWriteFile } = await import('node:fs/promises');
  await fsWriteFile(path, content, 'utf8');
}
