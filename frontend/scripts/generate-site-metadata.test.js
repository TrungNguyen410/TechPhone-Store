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

  it('writes every metadata URL with the configured Netlify origin', async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'techphone-site-metadata-'));
    const origin = 'https://techphone-store.netlify.app/';

    await generateSiteMetadata({ outputDir, siteUrl: origin });

    const [robots, sitemap] = await Promise.all([
      readFile(join(outputDir, 'robots.txt'), 'utf8'),
      readFile(join(outputDir, 'sitemap.xml'), 'utf8'),
    ]);
    const normalizedOrigin = 'https://techphone-store.netlify.app';

    expect(robots).toContain(`Sitemap: ${normalizedOrigin}/sitemap.xml`);
    for (const route of staticRoutes) {
      expect(sitemap).toContain(`${normalizedOrigin}${route}`);
    }
    expect(sitemap).not.toContain('http://localhost:5173');
  });
});
