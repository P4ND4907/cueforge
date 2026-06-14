import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) {
            return 'three';
          }
          return undefined;
        }
      }
    }
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      'qa/playwright/**',
      'playwright.config.mjs'
    ]
  }
}));
