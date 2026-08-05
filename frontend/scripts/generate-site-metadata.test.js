import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { generateSiteMetadata, staticRoutes } from './generate-site-metadata.mjs';

describe('generateSiteMetadata', () => {
  let outputDir;

  afterEach(async () => {
    if (outputDir) await rm(outputDir, { recursive: true, force: true });
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
});
