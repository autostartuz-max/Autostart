import { prisma } from './prisma';
import { keshla } from './kesh';

export interface SavolStat {
  /** Nechta talaba bu savolga javob bergan */
  total: number;
  /** Shulardan nechtasi OXIRGI urinishida xato qilgan */
  wrong: number;
  /** Xato qilganlar qaysi variantni belgilagan: variant id -> necha marta */
  tanlov: Map<number, number>;
  /** Javob bergan talabalar (mavzu bo'yicha statistikada birlashtiriladi) */
  talabalar: Set<number>;
  /** Oxirgi urinishida xato qilgan talabalar */
  xatoTalabalar: Set<number>;
}

/**
 * Har savol bo'yicha xato statistikasi (admin "Tahlil" sahifasi).
 *
 * Qoidalar (Tahlil sahifasi va "Qiyin savollar" bir xil ta'rifga tayanadi —
 * aks holda ikki oyna bir-biriga zid ro'yxat ko'rsatardi):
 *   - har (talaba, savol) juftligidan faqat OXIRGI javob hisoblanadi, ya'ni
 *     qayta yechib to'g'irlagan talaba endi xato qilgan hisoblanmaydi;
 *   - mehmon hisoblari (tgId 'guest-...') umuman kirmaydi.
 *
 * Oxirgi javoblarni bazaning o'zi tanlaydi (DISTINCT ON) — 600 mingdan ortiq javob
 * xotiraga yuklanmaydi; natija 5 daqiqa keshlanadi.
 */
export const xatoStatistikasi = keshla(5 * 60_000, xatoStatistikasiniHisobla);

async function xatoStatistikasiniHisobla(): Promise<Map<number, SavolStat>> {
  const answers = await prisma.$queryRaw<{ userId: number; questionId: number; isCorrect: boolean; chosen: string | null }[]>`
    SELECT DISTINCT ON (ua."userId", ua."questionId")
      ua."userId", ua."questionId", ua."isCorrect",
      CASE WHEN ua."isCorrect" THEN NULL ELSE ua.chosen END AS chosen
    FROM "UserAnswer" ua
    JOIN "User" u ON u.id = ua."userId"
    WHERE u."tgId" IS NULL OR u."tgId" NOT LIKE 'guest-%'
    ORDER BY ua."userId", ua."questionId", ua."answeredAt" DESC, ua.id DESC`;

  const jam = new Map<number, SavolStat>();
  for (const a of answers) {
    const g = jam.get(a.questionId) || {
      total: 0, wrong: 0, tanlov: new Map<number, number>(), talabalar: new Set<number>(), xatoTalabalar: new Set<number>(),
    };
    g.total++;
    g.talabalar.add(a.userId);
    if (!a.isCorrect) {
      g.wrong++;
      g.xatoTalabalar.add(a.userId);
      // Xato javobda qaysi variant belgilangani — tahlilda ko'rsatiladi
      for (const id of tanlovlar(a.chosen)) g.tanlov.set(id, (g.tanlov.get(id) || 0) + 1);
    }
    jam.set(a.questionId, g);
  }
  return jam;
}

/** '[12,15]' -> [12, 15]. Buzuq yoki bo'sh qiymat xatoga olib kelmaydi. */
function tanlovlar(chosen: string | null): number[] {
  try {
    const x = JSON.parse(chosen || '[]');
    return Array.isArray(x) ? x.map(Number).filter((v) => Number.isFinite(v)) : [];
  } catch {
    return [];
  }
}

/**
 * "Qiyin savollar" uchun yengil hisob: har savol bo'yicha nechta talaba javob bergan va nechtasi
 * oxirgi urinishida xato qilgan (o'sha ta'rif — oxirgi javob, mehmonlarsiz). Hammasini baza
 * hisoblaydi, 10 daqiqa keshlanadi — foydalanuvchi oynasi tez ochilsin.
 */
export const xatoUlushlari = keshla(10 * 60_000, async () => {
  const rows = await prisma.$queryRaw<{ questionId: number; total: number; wrong: number }[]>`
    SELECT t."questionId", count(*)::int AS total, count(*) FILTER (WHERE NOT t."isCorrect")::int AS wrong
    FROM (
      SELECT DISTINCT ON (ua."userId", ua."questionId") ua."questionId", ua."isCorrect"
      FROM "UserAnswer" ua
      JOIN "User" u ON u.id = ua."userId"
      WHERE u."tgId" IS NULL OR u."tgId" NOT LIKE 'guest-%'
      ORDER BY ua."userId", ua."questionId", ua."answeredAt" DESC, ua.id DESC
    ) t
    GROUP BY t."questionId"`;
  return new Map(rows.map((r) => [r.questionId, { total: r.total, wrong: r.wrong }]));
});

/**
 * Talabalar eng ko'p xato qiladigan savol id'lari — xato ULUSHI bo'yicha
 * kamayish tartibida.
 *
 * `minJavob` shovqinni kesadi: bitta odam bir marta xato qilgan savol hali
 * "qiyin" degani emas. Teng ulushda ko'proq odam yechgani yuqori turadi.
 */
export function qiyinSavolIdlari(
  jam: Map<number, { total: number; wrong: number }>,
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
