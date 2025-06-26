import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [],
  server: {
    host: '0.0.0.0',
    port: 4000,
    open: false,
    hmr: false,
  },
});