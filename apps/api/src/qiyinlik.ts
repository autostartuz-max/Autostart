import { prisma } from './prisma';

export interface SavolStat {
  /** Nechta talaba bu savolga javob bergan */
  total: number;
  /** Shulardan nechtasi OXIRGI urinishida xato qilgan */
  wrong: number;
}

/**
 * Har savol bo'yicha xato statistikasi.
 *
 * Qoidalar (Tahlil sahifasi va "Qiyin savollar" bir xil ta'rifga tayanadi —
 * aks holda ikki oyna bir-biriga zid ro'yxat ko'rsatardi):
 *   - har (talaba, savol) juftligidan faqat OXIRGI javob hisoblanadi, ya'ni
 *     qayta yechib to'g'irlagan talaba endi xato qilgan hisoblanmaydi;
 *   - mehmon hisoblari (tgId 'guest-...') umuman kirmaydi.
 */
export async function xatoStatistikasi(): Promise<Map<number, SavolStat>> {
  const mehmonlar = await prisma.user.findMany({
    where: { tgId: { startsWith: 'guest-' } },
    select: { id: true },
  });
  const mehmonId = new Set(mehmonlar.map((u) => u.id));

  const answers = await prisma.userAnswer.findMany({
    orderBy: { answeredAt: 'desc' },
    select: { userId: true, questionId: true, isCorrect: true },
  });

  const korilgan = new Set<string>();
  const jam = new Map<number, SavolStat>();
  for (const a of answers) {
    if (mehmonId.has(a.userId)) continue;
    const k = a.userId + ':' + a.questionId;
    if (korilgan.has(k)) continue; // eng yangisi birinchi keladi
    korilgan.add(k);
    const g = jam.get(a.questionId) || { total: 0, wrong: 0 };
    g.total++;
    if (!a.isCorrect) g.wrong++;
    jam.set(a.questionId, g);
  }
  return jam;
}

/**
 * Talabalar eng ko'p xato qiladigan savol id'lari — xato ULUSHI bo'yicha
 * kamayish tartibida.
 *
 * `minJavob` shovqinni kesadi: bitta odam bir marta xato qilgan savol hali
 * "qiyin" degani emas. Teng ulushda ko'proq odam yechgani yuqori turadi.
 */
export function qiyinSavolIdlari(
  jam: Map<number, SavolStat>,
  opts: { minJavob?: number; limit?: number } = {}
): number[] {
  const min = opts.minJavob ?? 2;
  return [...jam.entries()]
    .filter(([, g]) => g.wrong > 0 && g.total >= min)
    .map(([id, g]) => ({ id, ulush: g.wrong / g.total, total: g.total }))
    .sort((a, b) => b.ulush - a.ulush || b.total - a.total)
    .slice(0, opts.limit ?? 120)
    .map((x) => x.id);
}
