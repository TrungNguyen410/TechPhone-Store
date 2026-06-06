import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
});
