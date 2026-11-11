/** Yo'l belgilari: umumiy yordamchilar (routes/user.ts — ro'yxat, routes/admin.ts — boshqaruv) */

export const TOIFA_SONI = 8; // 1 Ogohlantiruvchi … 7 Qo'shimcha axborot, 8 Taniqlik belgilari

/** Raqamni tabiiy tartibda: 1.2 < 1.10, 5.8.1 < 5.8.10; raqamsizlar (bo'sh) toifa oxirida */
export function raqamSolishtir(a: string, b: string): number {
  if (!a !== !b) return a ? -1 : 1;
  const pa = a.match(/\d+/g)?.map(Number) || [];
  const pb = b.match(/\d+/g)?.map(Number) || [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return a.localeCompare(b);
}

interface Qator { id: number; toifa: number; raqam: string; name: string; description: string; imageUrl: string | null }

/** Ilova va sayt uchun ko'rinish: {id, toifa, raqam, nom, tavsif, rasm} */
export const belgiJson = (r: Qator) => ({ id: r.id, toifa: r.toifa, raqam: r.raqam, nom: r.name, tavsif: r.description, rasm: r.imageUrl });

export const belgiTartibi = (a: Qator, b: Qator) => a.toifa - b.toifa || raqamSolishtir(a.raqam, b.raqam) || a.id - b.id;

export const BELGI_TANLOV = { id: true, toifa: true, raqam: true, name: true, description: true, imageUrl: true } as const;
