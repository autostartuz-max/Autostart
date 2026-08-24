/**
 * Telegram xabarnomasi — yangi bog'lanish xabari kelganda adminni ogohlantirish.
 *
 * Sozlash (serverning apps/api/.env faylida):
 *   NOTIFY_BOT_TOKEN=...   bot tokeni
 *   NOTIFY_CHAT_ID=...     kimga yuborilsin (foydalanuvchi yoki guruh id'si)
 *
 * Ikkalasi ham bo'lmasa — xabarnoma jimgina o'chiq turadi, ilova normal ishlaydi.
 * MUHIM: bu faqat xabar YUBORADI. Botning webhook'iga tegmaydi, ya'ni o'sha bot
 * boshqa tizimda ishlatilayotgan bo'lsa ham buzilmaydi.
 */
import { NOTIFY_BOT_TOKEN, NOTIFY_CHAT_ID } from './env';

export function xabarnomaYoqilganmi(): boolean {
  return !!(NOTIFY_BOT_TOKEN && NOTIFY_CHAT_ID);
}

/**
 * Telegramga xabar yuboradi. Xato bo'lsa faqat logga yozadi — asosiy amal
 * (masalan xabarni bazaga saqlash) baribir muvaffaqiyatli hisoblanadi.
 */
export async function telegramgaYubor(text: string): Promise<boolean> {
  if (!xabarnomaYoqilganmi()) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: NOTIFY_CHAT_ID,
        text: text.slice(0, 4000),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error('Telegram xabarnoma xatosi:', r.status, (await r.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('Telegram xabarnoma yuborilmadi:', e?.message);
    return false;
  }
}

/** HTML uchun xavfsiz matn (foydalanuvchi yozgan matn teg bo'lib ketmasin) */
export function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
