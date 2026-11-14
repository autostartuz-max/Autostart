/** Aksiyalar: umumiy yordamchilar (routes/user.ts — ommaviy ro'yxat, routes/admin.ts — boshqaruv) */

export const AKSIYA_TANLOV = {
  id: true, sarlavha: true, matn: true, rasmUrl: true, faol: true, tartib: true, createdAt: true,
} as const;

/** Tartib: kichik "tartib" yuqorida, tengi bo'lsa — yangisi yuqorida */
export const AKSIYA_TARTIBI = [{ tartib: 'asc' as const }, { id: 'desc' as const }];

interface Qator {
  id: number; sarlavha: string; matn: string; rasmUrl: string | null; faol: boolean; tartib: number; createdAt: Date;
}

/** Sayt va ilova uchun ko'rinish */
export const aksiyaJson = (r: Qator) => ({
  id: r.id, sarlavha: r.sarlavha, matn: r.matn, rasm: r.rasmUrl, faol: r.faol, tartib: r.tartib, sana: r.createdAt,
});
