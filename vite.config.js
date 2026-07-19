import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page build: Vite only bundles index.html unless every page is listed.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        solutions: resolve(import.meta.dirname, 'solutions.html'),
      },
    },
  },
});
