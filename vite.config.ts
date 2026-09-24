import { defineConfig } from 'vite';

// Relative base: the built app works from any subpath (GitHub Pages project
// sites, Netlify drop, a subfolder on static hosting) without rebuilds.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
  },
});
