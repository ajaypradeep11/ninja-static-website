import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Multi-page build: Vite only bundles index.html unless every page is listed.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        'work/clinic': resolve(import.meta.dirname, 'work/clinic.html'),
        'work/restaurant': resolve(import.meta.dirname, 'work/restaurant.html'),
        'work/realty': resolve(import.meta.dirname, 'work/realty.html'),
        'work/dashboard': resolve(import.meta.dirname, 'work/dashboard.html'),
        'work/bot-store': resolve(import.meta.dirname, 'work/bot-store.html'),
        'work/conversy-app': resolve(import.meta.dirname, 'work/conversy-app.html'),
        'work/ninja-hr': resolve(import.meta.dirname, 'work/ninja-hr.html'),
        'work/ninja-learn': resolve(import.meta.dirname, 'work/ninja-learn.html'),
        'work/curriculearn': resolve(import.meta.dirname, 'work/curriculearn.html'),
        'work/irina': resolve(import.meta.dirname, 'work/irina.html'),
        'work/story': resolve(import.meta.dirname, 'work/story.html'),
        'work/ninja-commerce': resolve(import.meta.dirname, 'work/ninja-commerce.html'),
      },
    },
  },
  server: {
    // Bot demos call the deployed relay while developing locally.
    proxy: {
      '/api': { target: 'https://localninja.web.app', changeOrigin: true },
    },
  },
});
