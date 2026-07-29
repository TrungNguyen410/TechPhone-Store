import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const normalizeSiteUrl = (value = 'http://localhost:5173') =>
  value.trim().replace(/\/+$/, '');

export const staticRoutes = [
  '/', '/products', '/accessories', '/compare', '/reviews',
  '/contact', '/order-lookup', '/policies/warranty', '/policies/returns',
  '/policies/shipping', '/policies/payment',
];

const routeEntries = staticRoutes.map((route) => `  <url><loc>{{origin}}${route}</loc></url>`).join('\n');

export const generateSiteMetadata = async ({
  outputDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public'),
  siteUrl = process.env.VITE_SITE_URL || 'http://localhost:5173',
} = {}) => {
  const origin = normalizeSiteUrl(siteUrl);
  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\n\nSitemap: ${origin}/sitemap.xml\n`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routeEntries.replaceAll('{{origin}}', origin)}\n</urlset>\n`;

  await Promise.all([
    writeFile(resolve(outputDir, 'robots.txt'), robots),
    writeFile(resolve(outputDir, 'sitemap.xml'), sitemap),
  ]);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateSiteMetadata();
}
