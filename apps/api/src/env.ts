import 'dotenv/config';

export const PORT = Number(process.env.PORT || 4000);
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const BOT_TOKEN = process.env.BOT_TOKEN || '';
// DEV_AUTH: brauzerda soxta foydalanuvchi bilan ishlash (Telegram tokeni shart emas)
export const DEV_AUTH = (process.env.DEV_AUTH ?? '1') === '1';
