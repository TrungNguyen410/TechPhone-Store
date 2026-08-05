import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (env.VITE_SITE_URL || (mode === 'production' ? '' : 'http://localhost:5173'))
    .trim()
    .replace(/\/+$/, '');
  let parsedSiteUrl;
  try {
    parsedSiteUrl = new URL(siteUrl);
  } catch {
    throw new Error('VITE_SITE_URL must be an absolute HTTP(S) URL for a production build');
  }
  if (!['http:', 'https:'].includes(parsedSiteUrl.protocol)) {
    throw new Error('VITE_SITE_URL must be an absolute HTTP(S) URL for a production build');
  }
  process.env.VITE_SITE_URL = siteUrl;

  return {
    plugins: [
      {
        name: 'techphone-html-site-url',
        enforce: 'pre',
        transformIndexHtml: (html) => html.replaceAll('%VITE_SITE_URL%', siteUrl),
      },
      react(),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              },
              {
                name: 'chart-vendor',
                test: /node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              },
              {
                name: 'ui-vendor',
                test: /node_modules[\\/](bootstrap|react-icons|react-toastify)[\\/]/,
              },
            ],
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
