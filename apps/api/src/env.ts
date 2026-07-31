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

// Groq (vision) — skrinshotdan savolni AI bilan o'qish. Kalit: env yoki ubuntu yozadigan fayl.
export const GROQ_API_KEY = process.env.GROQ_API_KEY || fileKey('/home/ubuntu/groq-key.txt');
export const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';

// OpenAI (vision) — aniqroq (pullik). Bor bo'lsa asosiy, Groq zaxira.
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || fileKey('/home/ubuntu/openai-key.txt');
export const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
