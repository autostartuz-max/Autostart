/**
 * Og'ir hisob-kitoblar uchun oddiy xotira keshi (bitta pm2 jarayoni).
 * `ms` davomida oxirgi natija qaytariladi; bir vaqtda kelgan so'rovlar bitta hisobni kutadi —
 * reyting/statistika har so'rovda qaytadan hisoblanib serverni qotirmasin.
 */
export function keshla<T>(ms: number, hisobla: () => Promise<T>) {
  let qiymat: T | undefined;
  let vaqt = 0;
  let jarayon: Promise<T> | null = null;
  return (): Promise<T> => {
    if (qiymat !== undefined && Date.now() - vaqt < ms) return Promise.resolve(qiymat);
    if (!jarayon) {
      jarayon = hisobla()
        .then((v) => { qiymat = v; vaqt = Date.now(); return v; })
        .finally(() => { jarayon = null; });
    }
    return jarayon;
  };
}
