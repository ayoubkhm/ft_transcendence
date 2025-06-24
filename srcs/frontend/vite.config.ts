import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // bind to all interfaces so Nginx (other containers) can reach it
    host: '0.0.0.0',
    port: 4000,
    // disable automatic browser open inside Docker containers
    open: false
  }
});