import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // LAN + tunnel orqali kirishga ruxsat
    allowedHosts: true, // istalgan host (cloudflare tunnel) qabul qilinadi
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
