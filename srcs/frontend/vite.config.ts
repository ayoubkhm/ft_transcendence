import { defineConfig } from 'vite';
// Remove React plugin; using vanilla JS for SPA

export default defineConfig({
  plugins: [],
  server: {
    host: '0.0.0.0',
    port: 4000,
    open: false,
    // Disable HMR to avoid WebSocket TLS errors behind HTTPS proxy
    hmr: false,
  },
});