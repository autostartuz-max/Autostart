/**
 * Parolni admin panelida ko'rsatish uchun QAYTARILADIGAN saqlash.
 *
 * Kirish tekshiruvi baribir bcrypt hash bo'yicha ishlaydi (passwordHash) —
 * bu yerdagi nusxa faqat ko'rsatish uchun.
 *
 * XAVF (foydalanuvchi bilib turib tanladi): parolni qaytarib olish mumkin
 * bo'lgan har qanday saqlash usuli xavfsizlikni pasaytiradi. Shuning uchun
 * ochiq matn EMAS, AES-256-GCM bilan shifrlanadi: baza dump qilinsa ham,
 * server kalitisiz parollar ochilmaydi. Kalit .env dagi PASSWORD_KEY dan
 * olinadi; berilmasa JWT_SECRET dan hosil qilinadi (alohida sozlash shart
 * bo'lmasin uchun).
 *
 * Kalit o'zgarsa — eski yozuvlar ochilmay qoladi (xato bermaydi, shunchaki
 * ko'rsatilmaydi). Bu kutilgan xulq.
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { JWT_SECRET } from './env';

const KEY = createHash('sha256')
  .update(process.env.PASSWORD_KEY || JWT_SECRET || 'dev-key')
  .digest(); // 32 bayt

/** parol -> "iv:tag:shifr" (base64) */
export function shifrla(parol: string): string | null {
  if (!parol) return null;
  try {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', KEY, iv);
    const enc = Buffer.concat([c.update(parol, 'utf8'), c.final()]);
    return [iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join(':');
  } catch {
    return null;
  }
}

/** "iv:tag:shifr" -> parol. Ochib bo'lmasa null (kalit o'zgargan bo'lishi mumkin) */
export function ochish(saqlangan: string | null | undefined): string | null {
  if (!saqlangan) return null;
  try {
    const [ivB, tagB, encB] = saqlangan.split(':');
    if (!ivB || !tagB || !encB) return null;
    const d = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB, 'base64'));
    d.setAuthTag(Buffer.from(tagB, 'base64'));
    return Buffer.concat([d.update(Buffer.from(encB, 'base64')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
