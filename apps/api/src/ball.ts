import { prisma } from './prisma';

/**
 * Daraja tizimi: foydalanuvchi ilovadan foydalanib ball yig'adi va darajasi
 * oshadi (Piyoda → Yo'lovchi → Haydovchi → Professional).
 *
 * Har ball BallTarix ga yoziladi; kalit takrorlanmasligi (userId + kalit unique)
 * bir savol, video, shablon yoki kun uchun ball faqat bir marta berilishini
 * kafolatlaydi — qayta yechish yoki qayta yuborish ball ko'paytirmaydi.
 */
export const DARAJALAR = [
  { nom: 'Piyoda', dan: 0 },
  { nom: 'Yo‘lovchi', dan: 300 },
  { nom: 'Haydovchi', dan: 1000 },
  { nom: 'Professional', dan: 3000 },
] as const;

export const BALL = {
  javob: 1, // savolga birinchi marta to'g'ri javob
  shablon: 20, // shablonni yiqilmasdan (3 tadan kam xato) tugatish
  imtihon: 30, // real imtihondan o'tish
  video: 10, // amaliy mashg'ulot videosini oxirigacha ko'rish
  oktagonJang: 1,
  oktagonGalaba: 5,
  faollik: 5, // kunning birinchi javobi
  taklif: 100, // promokod bilan kelgan do'st maktabga yozildi
} as const;

// Kuniga ko'pi bilan shuncha Oktagon jangi va real imtihon ball beradi (bot bilan "yig'ish"ga qarshi)
export const KUNLIK_OKTAGON = 20;
export const KUNLIK_IMTIHON = 3;

export function daraja(ball: number) {
  let i = 0;
  while (i + 1 < DARAJALAR.length && ball >= DARAJALAR[i + 1].dan) i++;
  const keyingi = DARAJALAR[i + 1] || null;
  return { nom: DARAJALAR[i].nom, dan: DARAJALAR[i].dan, keyingi };
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

/** Kunning birinchi faolligi — +5 (kuniga bir marta) */
export const faollik = (userId: number) => ballQosh(userId, 'faollik', BALL.faollik, `faollik:${kun()}`);

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
