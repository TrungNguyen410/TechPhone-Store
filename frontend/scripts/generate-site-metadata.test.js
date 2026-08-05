import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { generateSiteMetadata, staticRoutes } from './generate-site-metadata.mjs';

const execFileAsync = promisify(execFile);
const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = resolve(frontendDir, 'node_modules/vite/bin/vite.js');
const viteConfig = resolve(frontendDir, 'vite.config.js');

describe('generateSiteMetadata', () => {
  let outputDir;
  let projectDir;

  afterEach(async () => {
    if (outputDir) await rm(outputDir, { recursive: true, force: true });
    if (projectDir) await rm(projectDir, { recursive: true, force: true });
    outputDir = undefined;
    projectDir = undefined;
  });

  it('writes every metadata URL with the configured production origin', async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'techphone-site-metadata-'));
    const origin = 'https://shop.techphone.example/';

    await generateSiteMetadata({ outputDir, siteUrl: origin });

    const [robots, sitemap] = await Promise.all([
      readFile(join(outputDir, 'robots.txt'), 'utf8'),
      readFile(join(outputDir, 'sitemap.xml'), 'utf8'),
    ]);
    const normalizedOrigin = 'https://shop.techphone.example';

    expect(robots).toContain(`Sitemap: ${normalizedOrigin}/sitemap.xml`);
    for (const route of staticRoutes) {
      expect(sitemap).toContain(`${normalizedOrigin}${route}`);
    }
    expect(sitemap).not.toContain('http://localhost:5173');
  });

  it('rejects missing or non-HTTP production origins', async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'techphone-site-metadata-'));

    await expect(generateSiteMetadata({ outputDir, siteUrl: '' }))
      .rejects.toThrow('VITE_SITE_URL');
    await expect(generateSiteMetadata({ outputDir, siteUrl: '/relative' }))
      .rejects.toThrow('VITE_SITE_URL');
  });

  it('rejects loopback metadata for Render production', async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'techphone-site-metadata-'));

    await expect(generateSiteMetadata({
      outputDir,
      siteUrl: 'http://localhost:3000',
      deploymentTarget: 'render',
    })).rejects.toThrow(/VITE_SITE_URL.*loopback/i);
  });

  it('loads .env.production in the Vite build lifecycle and leaves source public unchanged', async () => {
    projectDir = await createBuildFixture({
      '.env.production': [
        'VITE_DEPLOYMENT_TARGET=render',
        'VITE_USE_MOCK=false',
        'VITE_API_URL=https://api.production.example/api',
        'VITE_SITE_URL=https://production.example',
      ].join('\n'),
    });

    await runViteBuild(projectDir);

    await expectBuildMetadata(projectDir, 'https://production.example');
    expect(await readdir(join(projectDir, 'public'))).toEqual(['keep.txt']);
    expect(await readFile(join(projectDir, 'public/keep.txt'), 'utf8')).toBe('unchanged');
  });

  it('uses Vite local and mode env precedence for generated metadata', async () => {
    projectDir = await createBuildFixture({
      '.env': 'VITE_SITE_URL=https://base.example',
      '.env.local': 'VITE_SITE_URL=https://base-local.example',
      '.env.production': [
        'VITE_DEPLOYMENT_TARGET=render',
        'VITE_USE_MOCK=false',
        'VITE_API_URL=https://api.production.example/api',
        'VITE_SITE_URL=https://production.example',
      ].join('\n'),
      '.env.production.local': 'VITE_SITE_URL=https://production-local.example',
    });

    await runViteBuild(projectDir);

    await expectBuildMetadata(projectDir, 'https://production-local.example');
  });
});

const createBuildFixture = async (envFiles) => {
  const root = await mkdtemp(join(tmpdir(), 'techphone-vite-metadata-'));
  await mkdir(join(root, 'src'));
  await mkdir(join(root, 'public'));
  await Promise.all([
    writeFile(join(root, 'index.html'), [
      '<!doctype html>',
      '<link rel="canonical" href="%VITE_SITE_URL%">',
      '<div id="app"></div>',
      '<script type="module" src="/src/main.js"></script>',
    ].join('\n')),
    writeFile(join(root, 'src/main.js'), 'document.querySelector("#app").textContent = "ok";'),
    writeFile(join(root, 'public/keep.txt'), 'unchanged'),
    ...Object.entries(envFiles).map(([name, contents]) => writeFile(join(root, name), contents)),
  ]);
  return root;
};

const runViteBuild = async (root) => {
  const childEnv = { ...process.env };
  for (const name of Object.keys(childEnv)) {
    if (name.startsWith('VITE_')) delete childEnv[name];
  }
  await execFileAsync(
    process.execPath,
    [viteBin, 'build', '--config', viteConfig, '--mode', 'production'],
    { cwd: root, env: childEnv },
  );
};

const expectBuildMetadata = async (root, origin) => {
  const [robots, sitemap, html] = await Promise.all([
    readFile(join(root, 'dist/robots.txt'), 'utf8'),
    readFile(join(root, 'dist/sitemap.xml'), 'utf8'),
    readFile(join(root, 'dist/index.html'), 'utf8'),
  ]);

  expect(robots).toContain(`${origin}/sitemap.xml`);
  expect(sitemap).toContain(`${origin}/products`);
  expect(html).toContain(`href="${origin}"`);
};
