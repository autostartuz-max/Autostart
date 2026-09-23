import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Mobil build'da (`--mode mobile`) Telegram skripti kerak emas: ilova ichida
 * Telegram yo'q, ustiga Apple tashqi serverdan kod yuklanishini yoqtirmaydi.
 */
const telegramniOlib = (mode: string) => ({
  name: 'telegram-skriptini-olib-tashlash',
  transformIndexHtml(html: string) {
    if (mode !== 'mobile') return html;
    return html.replace(/\s*<script src="https:\/\/telegram\.org[^>]*><\/script>/, '');
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [react(), telegramniOlib(mode)],
  server: {
    port: 5173,
    host: true, // LAN + tunnel orqali kirishga ruxsat
    allowedHosts: true, // istalgan host (cloudflare tunnel) qabul qilinadi
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
}));
