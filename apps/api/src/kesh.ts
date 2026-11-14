/**
 * Og'ir hisob-kitoblar uchun oddiy xotira keshi (bitta pm2 jarayoni).
 * `ms` davomida oxirgi natija qaytariladi. Muddati o'tgan bo'lsa ham eski natija DARHOL beriladi,
 * yangisi esa fonda hisoblanadi — hech bir foydalanuvchi hisobni kutib qolmaydi (faqat eng birinchi
 * so'rov kutadi; buni ham `isit()` server ishga tushganda oldindan bajaradi).
 * Bir vaqtda kelgan so'rovlar bitta hisobni kutadi.
 */
export function keshla<T>(ms: number, hisobla: () => Promise<T>) {
  let qiymat: T | undefined;
  let vaqt = 0;
  let jarayon: Promise<T> | null = null;
  let avlod = 0; // tozala() oshiradi — tozalashdan oldin boshlangan hisob eski natijani yozib qo'ymasin

  const yangila = (): Promise<T> => {
    if (!jarayon) {
      const bu = avlod;
      const p: Promise<T> = hisobla()
        .then((v) => { if (bu === avlod) { qiymat = v; vaqt = Date.now(); } return v; })
        .finally(() => { if (jarayon === p) jarayon = null; });
      jarayon = p;
    }
    return jarayon;
  };

  const ol = (): Promise<T> => {
    if (qiymat === undefined) return yangila(); // hali hech qachon hisoblanmagan — kutamiz
    if (Date.now() - vaqt >= ms) yangila().catch((e) => console.error('[kesh]', e?.message || e)); // fonda
    return Promise.resolve(qiymat);
  };
  /** Ma'lumot o'zgardi (masalan admin savolni tahrirladi) — keyingi so'rov yangisini hisoblaydi */
  ol.tozala = () => { avlod++; qiymat = undefined; vaqt = 0; jarayon = null; };
  /** Server ishga tushganda keshni oldindan to'ldirish (xato bo'lsa — jim) */
  ol.isit = () => { yangila().catch((e) => console.error('[kesh]', e?.message || e)); };
  return ol;
}
