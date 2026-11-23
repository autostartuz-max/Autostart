import { prisma } from './prisma';

/**
 * Daraja tizimi: foydalanuvchi ilovadan foydalanib coin yig'adi va darajasi
 * oshadi (Piyoda → Velosipedchi → Skuterchi → Haydovchi → Pilot; 2026-11-14).
 * Ilova yangi darajaga chiqqanda tabrik ko'rsatadi (web: ilova/DarajaTabrik.tsx — nomlar shu yerdagidek).
 *
 * Har ball BallTarix ga yoziladi; kalit takrorlanmasligi (userId + kalit unique)
 * bir savol, video, shablon yoki kun uchun ball faqat bir marta berilishini
 * kafolatlaydi — qayta yechish yoki qayta yuborish ball ko'paytirmaydi.
 */
export const DARAJALAR = [
  { nom: 'Piyoda', dan: 0 },
  { nom: 'Velosipedchi', dan: 250 },
  { nom: 'Skuterchi', dan: 500 },
  { nom: 'Haydovchi', dan: 1000 },
  { nom: 'Pilot', dan: 2000 },
] as const;

export const BALL = {
  javob: 1, // savolga birinchi marta to'g'ri javob
  faollik: 5, // kunning birinchi javobi
  seriya: 20, // 15 kun uzluksiz faollik (15, 30, 45… kunlarda)
  shablon: 20, // shablonni yiqilmasdan (3 tadan kam xato) tugatish
  imtihon: 30, // real imtihondan o'tish
  sharh: 20, // shablondagi barcha savollarning video sharhini ko'rish (har shablon bir marta)
  nazariy: 20, // nazariy video darslik (har mashg'ulot) — Darslik bo'limi hali yo'q, tez orada
  video: 20, // avtodromdagi amaliy mashg'ulot videosini oxirigacha ko'rish (har video)
  oktagonJang: 1,
  oktagonGalaba: 5,
  taklif: 100, // promokod bilan kelgan do'st maktabga yozildi
} as const;

/** Uzluksiz faollik seriyasi: shuncha kun ketma-ket faol bo'lsa — BALL.seriya */
export const SERIYA_KUN = 15;

// Kuniga ko'pi bilan shuncha Oktagon jangi va real imtihon ball beradi (bot bilan "yig'ish"ga qarshi)
export const KUNLIK_OKTAGON = 20;
export const KUNLIK_IMTIHON = 3;

/**
 * Daraja. Pilot — 2000 coin VA barcha savolga kamida bir marta to'g'ri javob (2026-11 hujjat:
 * "pilot qachonki o'quvchi testlarni 100% yechganda beriladi"). hammasiTogri berilmasa — faqat coin.
 */
export function daraja(ball: number, hammasiTogri = true) {
  let i = 0;
  while (i + 1 < DARAJALAR.length && ball >= DARAJALAR[i + 1].dan) i++;
  if (DARAJALAR[i].nom === 'Pilot' && !hammasiTogri) i--;
  const keyingi = DARAJALAR[i + 1] || null;
  return { nom: DARAJALAR[i].nom, dan: DARAJALAR[i].dan, keyingi, pilotShart: !hammasiTogri && ball >= DARAJALAR[DARAJALAR.length - 1].dan };
}

/** Nashr qilingan savollardan nechtasiga kamida bir marta to'g'ri javob berilgan (SQL agregatsiya) */
export async function togriYechilgan(userId: number, savolIdlar: number[]) {
  if (!savolIdlar.length) return 0;
  const r = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(DISTINCT "questionId")::int AS n FROM "UserAnswer"
    WHERE "userId" = ${userId} AND "isCorrect" = true AND "questionId" = ANY(${savolIdlar})`;
  return r[0]?.n ?? 0;
}

/** Toshkent vaqti bo'yicha sana (UTC+5): "2026-11-03" */
export function kun(d = new Date()) {
  return new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 10);
}

/** Ball qo'shish. Shu kalit bilan avval berilgan bo'lsa — hech narsa qilmaydi (false) */
export async function ballQosh(userId: number, sabab: string, miqdor: number, kalit: string) {
  try {
    await prisma.$transaction([
      prisma.ballTarix.create({ data: { userId, sabab, miqdor, kalit } }),
      prisma.user.update({ where: { id: userId }, data: { ball: { increment: miqdor } } }),
    ]);
    return true;
  } catch (e: any) {
    if (e?.code === 'P2002') return false; // allaqachon berilgan
    throw e;
  }
}

/** Bugun shu sabab bilan necha marta ball berilgan (kunlik chegaralar uchun) */
export async function bugungiSoni(userId: number, sabab: string) {
  return prisma.ballTarix.count({ where: { userId, sabab, kalit: { startsWith: `${sabab}:${kun()}` } } });
}

/**
 * Kunning birinchi faolligi — +5 (kuniga bir marta). Shu kun bilan uzluksiz seriya
 * 15 ga (30, 45…) yetsa — qo'shimcha +20 (o'sha kun uchun bir marta).
 */
export async function faollik(userId: number) {
  const yangi = await ballQosh(userId, 'faollik', BALL.faollik, `faollik:${kun()}`);
  if (yangi) {
    const n = await streak(userId);
    if (n > 0 && n % SERIYA_KUN === 0) await ballQosh(userId, 'seriya', BALL.seriya, `seriya:${kun()}`);
  }
  return yangi;
}

/**
 * Savolning video sharhi oxirigacha ko'rildi. Shablonning HAMMA savolida video bo'lsa va
 * foydalanuvchi ularning barchasini ko'rgan bo'lsa — +20 (har shablon uchun bir marta).
 */
export async function sharhKorildi(userId: number, questionId: number) {
  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true, shablon: true, videoUrl: true } });
  if (!q || !q.videoUrl) return { ok: false as const };
  await prisma.sharhKorish.upsert({
    where: { userId_questionId: { userId, questionId } },
    update: {},
    create: { userId, questionId },
  });
  if (!q.shablon) return { ok: true as const, ball: 0 };
  const savollar = await prisma.question.findMany({
    where: { shablon: q.shablon, status: 'published' },
    select: { id: true, videoUrl: true },
  });
  const hammasidaVideo = savollar.length > 0 && savollar.every((s) => !!s.videoUrl);
  const korilgan = await prisma.sharhKorish.count({ where: { userId, questionId: { in: savollar.map((s) => s.id) } } });
  const jami = savollar.length;
  let ball = 0;
  if (hammasidaVideo && korilgan >= jami) {
    if (await ballQosh(userId, 'sharh', BALL.sharh, `sharh:${q.shablon}`)) ball = BALL.sharh;
  }
  return { ok: true as const, shablon: q.shablon, korilgan, jami, ball };
}

/** Necha kun ketma-ket faol (bugun yoki kecha tugagan zanjir) */
export async function streak(userId: number) {
  const r = await prisma.ballTarix.findMany({
    where: { userId, sabab: 'faollik' },
    orderBy: { vaqt: 'desc' },
    take: 400,
    select: { kalit: true },
  });
  const kunlar = new Set(r.map((x) => x.kalit.slice('faollik:'.length)));
  let d = new Date();
  // Bugun hali faol bo'lmagan bo'lsa ham kechagi zanjir uzilmagan hisoblanadi
  if (!kunlar.has(kun(d))) d = new Date(d.getTime() - 86400_000);
  let n = 0;
  while (kunlar.has(kun(d))) {
    n++;
    d = new Date(d.getTime() - 86400_000);
  }
  return n;
}

/** Shaxsiy promokod: ismning lotin harflari (4 tagacha) + id, masalan "MUZA418" */
export async function promoKodi(userId: number) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { promoKod: true, firstName: true } });
  if (!u) return null;
  if (u.promoKod) return u.promoKod;
  const harflar = (u.firstName || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'AUTO';
  // Harflar + raqam: id noyob, harflarda raqam yo'q — kod ham noyob
  const kod = harflar + userId;
  await prisma.user.update({ where: { id: userId }, data: { promoKod: kod } });
  return kod;
}

/** Shablonni yiqilmasdan tugatdimi: hamma savoliga javob bor va oxirgi javoblarda 3 tadan kam xato */
export async function shablonTekshir(userId: number, shablon: number) {
  const savollar = await prisma.question.findMany({ where: { status: 'published', shablon }, select: { id: true } });
  if (!savollar.length) return;
  const javoblar = await prisma.userAnswer.findMany({
    where: { userId, questionId: { in: savollar.map((q) => q.id) } },
    orderBy: { answeredAt: 'desc' },
    select: { questionId: true, isCorrect: true },
  });
  const oxirgi = new Map<number, boolean>();
  for (const a of javoblar) if (!oxirgi.has(a.questionId)) oxirgi.set(a.questionId, a.isCorrect);
  if (oxirgi.size < savollar.length) return; // hali hammasi yechilmagan
  const xato = [...oxirgi.values()].filter((x) => !x).length;
  if (xato < 3) await ballQosh(userId, 'shablon', BALL.shablon, `shablon:${shablon}`);
}
