import fs from 'fs';
import path from 'path';

/**
 * Yuklangan fayllar joyi.
 *
 * Videolar bazaga emas, diskka yoziladi. Papka .gitignore'da — ya'ni serverdagi
 * `git pull` unga tegmaydi va deploy'dan keyin videolar joyida qoladi.
 * Boshqa diskka ko'chirish kerak bo'lsa: UPLOAD_DIR=/var/autostart-uploads
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../uploads');

/** Amaliy mashg'ulot videolari shu papkada */
export const LESSON_DIR = path.join(UPLOAD_DIR, 'lessons');

/** Papka yo'q bo'lsa yaratadi va yo'lini qaytaradi */
export function ensureLessonDir(): string {
  fs.mkdirSync(LESSON_DIR, { recursive: true });
  return LESSON_DIR;
}

/**
 * Bazadagi nomdan diskdagi to'liq yo'lni yasaydi.
 * path.basename — bazaga qandaydir yo'l bilan "../../etc/passwd" tushib qolsa ham
 * papkadan tashqariga chiqib ketmaslik uchun.
 */
export function lessonFilePath(fileName: string): string {
  return path.join(ensureLessonDir(), path.basename(fileName));
}

/** Faylni o'chiradi; yo'q bo'lsa ham xato bermaydi */
export function lessonFileniOchir(fileName: string) {
  try { fs.unlinkSync(lessonFilePath(fileName)); } catch { /* fayl allaqachon yo'q */ }
}

/** Toifalar — admin va foydalanuvchi sahifalari shu ro'yxatga tayanadi */
export const TOIFALAR = ['A', 'B', 'C', 'D', 'E', 'BC', 'CE', 'Boshqa'] as const;

/** Kelgan toifani ro'yxatdagi qiymatga keltiradi; notanishi — "Boshqa" */
export function toifaniTekshir(raw: any): string {
  const v = String(raw || '').trim().toUpperCase();
  const topildi = (TOIFALAR as readonly string[]).find((t) => t.toUpperCase() === v);
  return topildi || 'Boshqa';
}
