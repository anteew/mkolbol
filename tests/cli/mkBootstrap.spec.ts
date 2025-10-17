import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bootstrapProject, listTemplates } from '../../src/mk/bootstrap.js';
import { existsSync } from 'node:fs';
import { rm, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('mk bootstrap', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(
      tmpdir(),
      `mk-bootstrap-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('bootstrapProject', () => {
    it('should create a new project from template', async () => {
      const appName = 'test-calc';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {
        template: 'hello-calculator',
        source: 'local',
        verbose: false,
      });

      expect(existsSync(appDir)).toBe(true);
      expect(existsSync(join(appDir, 'package.json'))).toBe(true);
      expect(existsSync(join(appDir, 'mk.json'))).toBe(true);
      expect(existsSync(join(appDir, 'src'))).toBe(true);
      expect(existsSync(join(appDir, 'README.md'))).toBe(true);
      expect(existsSync(join(appDir, 'tsconfig.json'))).toBe(true);
      expect(existsSync(join(appDir, '.mk'))).toBe(true);
    });

    it('should update package.json with project name', async () => {
      const appName = 'my-custom-app';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {
        template: 'hello-calculator',
        source: 'local',
      });

      const pkgContent = await readFile(join(appDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgContent);

      expect(pkg.name).toBe(appName);
    });

    it('should configure mkolbol dependency with local source', async () => {
      const appName = 'test-local';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {
        source: 'local',
      });

      const pkgContent = await readFile(join(appDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgContent);

      expect(pkg.dependencies.mkolbol).toBeDefined();
      expect(pkg.dependencies.mkolbol).toMatch(/mkolbol/);
    });

    it('should configure mkolbol dependency with git source', async () => {
      const appName = 'test-git';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {
        source: 'git',
        gitTag: 'v0.2.0',
      });

      const pkgContent = await readFile(join(appDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgContent);

      expect(pkg.dependencies.mkolbol).toBe('github:anteew/mkolbol#v0.2.0');
    });

    it('should use default git tag when not specified', async () => {
      const appName = 'test-git-default';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {
        source: 'git',
      });

      const pkgContent = await readFile(join(appDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgContent);

      expect(pkg.dependencies.mkolbol).toBe('github:anteew/mkolbol#main');
    });

    it('should update README with project name', async () => {
      const appName = 'my-special-calc';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {
        template: 'hello-calculator',
      });

      const readmeContent = await readFile(join(appDir, 'README.md'), 'utf8');

      expect(readmeContent).toContain(appName);
      expect(readmeContent).not.toContain('hello-calculator');
    });

    it('should throw error if directory already exists', async () => {
      const appName = 'existing-dir';
      const appDir = join(testDir, appName);

      await mkdir(appDir, { recursive: true });

      await expect(bootstrapProject(appDir, { template: 'hello-calculator' })).rejects.toThrow(
        /already exists/,
      );
    });

    it('should throw error if template does not exist', async () => {
      const appName = 'test-invalid';
      const appDir = join(testDir, appName);

      await expect(bootstrapProject(appDir, { template: 'non-existent-template' })).rejects.toThrow(
        /not found/,
      );
    });

    it('should handle verbose mode', async () => {
      const appName = 'test-verbose';
      const appDir = join(testDir, appName);

      const logSpy: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        logSpy.push(args.join(' '));
      };

      try {
        await bootstrapProject(appDir, { verbose: true });

        expect(logSpy.some((log) => log.includes('[bootstrap]'))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it('should create all template files', async () => {
      const appName = 'test-files';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {
        template: 'hello-calculator',
      });

      const expectedFiles = [
        'package.json',
        'tsconfig.json',
        'README.md',
        'ACCEPTANCE.md',
        'mk.json',
        '.gitignore',
        'src/index.ts',
        '.mk/options.json',
      ];

      for (const file of expectedFiles) {
        expect(existsSync(join(appDir, file))).toBe(true);
      }
    });

    it('should preserve .mk directory structure', async () => {
      const appName = 'test-mk-dir';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {});

      expect(existsSync(join(appDir, '.mk'))).toBe(true);
      expect(existsSync(join(appDir, '.mk/options.json'))).toBe(true);
    });
  });

  describe('listTemplates', () => {
    it('should return available templates', async () => {
      const templates = await listTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include hello-calculator template', async () => {
      const templates = await listTemplates();

      const helloCalc = templates.find((t) => t.name === 'hello-calculator');
      expect(helloCalc).toBeDefined();
      expect(helloCalc?.description).toBeDefined();
    });

    it('should return template metadata', async () => {
      const templates = await listTemplates();

      expect(templates.length).toBeGreaterThan(0);

      const template = templates[0];
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(typeof template.name).toBe('string');
      expect(typeof template.description).toBe('string');
    });
  });

  describe('source options', () => {
    it('should handle tarball source with explicit path', async () => {
      const appName = 'test-tarball-explicit';
      const appDir = join(testDir, appName);
      const fakeTarballPath = '/tmp/mkolbol-0.2.0.tgz';

      await bootstrapProject(appDir, {
        source: 'tarball',
        tarballPath: fakeTarballPath,
      });

      const pkgContent = await readFile(join(appDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgContent);

      expect(pkg.dependencies.mkolbol).toBe(fakeTarballPath);
    });

    it('should default to local source', async () => {
      const appName = 'test-default-source';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {});

      const pkgContent = await readFile(join(appDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgContent);

      expect(pkg.dependencies.mkolbol).toBeDefined();
      expect(typeof pkg.dependencies.mkolbol).toBe('string');
    });
  });

  describe('template selection', () => {
    it('should use hello-calculator as default template', async () => {
      const appName = 'test-default-template';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, {});

      expect(existsSync(join(appDir, 'mk.json'))).toBe(true);

      const pkgContent = await readFile(join(appDir, 'package.json'), 'utf8');
      const pkg = JSON.parse(pkgContent);

      expect(pkg.description).toContain('calculator');
    });
  });

  describe('installation options', () => {
    it('should skip dependency installation without --yes flag', async () => {
      const appName = 'test-no-install';
      const appDir = join(testDir, appName);

      await bootstrapProject(appDir, { yes: false });

      expect(existsSync(join(appDir, 'node_modules'))).toBe(false);
    });
  });
});
