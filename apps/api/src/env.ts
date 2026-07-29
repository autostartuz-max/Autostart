import 'dotenv/config';
import { readFileSync } from 'fs';

export const PORT = Number(process.env.PORT || 4000);
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const BOT_TOKEN = process.env.BOT_TOKEN || '';
// DEV_AUTH: brauzerda soxta foydalanuvchi bilan ishlash (Telegram tokeni shart emas)
export const DEV_AUTH = (process.env.DEV_AUTH ?? '1') === '1';

// Gemini (Nano Banana) — rasmni AI bilan qayta bo'yash uchun.
// Kalit: process.env (.env) YOKI ubuntu yoza oladigan fayl (deploy .env ni tegmaydi).
function fileKey(p: string): string {
  try { return readFileSync(p, 'utf8').trim(); } catch { return ''; }
}
export const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || fileKey('/home/ubuntu/gemini-key.txt');
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
