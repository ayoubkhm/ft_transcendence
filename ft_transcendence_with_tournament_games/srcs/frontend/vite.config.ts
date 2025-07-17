import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  server: {
    host: '0.0.0.0',
    port: 4000,
    open: false,
    hmr: false,
    allowedHosts: [
      '.ngrok-free.app',
      'localhost',
      // Allow Docker network hostname when proxied through Nginx
      'frontend',
    ],
  },
});
