/**
 * Daraja tizimi uchun boshlang'ich ball: tizim qo'shilishidan oldingi faollikdan.
 * Busiz eski foydalanuvchilar ham 0 dan boshlardi.
 *
 *   cd /opt/autostart && sudo npx tsx apps/api/scripts/ball-tiklash.ts
 *
 * Hisoblanadi: savolga birinchi to'g'ri javob (+1), faol kunlar (+5), yiqilmasdan
 * tugatilgan shablonlar (+20), Oktagon janglari (+1, g'alaba +5).
 * Qayta ishga tushirish xavfsiz: har ball BallTarix kaliti bilan bir marta yoziladi,
 * oxirida User.ball tarix yig'indisidan qayta hisoblanadi.
 */
import { PrismaClient } from '@prisma/client';
import { BALL, kun } from '../src/ball';

const prisma = new PrismaClient();
type Qator = { userId: number; sabab: string; miqdor: number; kalit: string; vaqt: Date };

async function yoz(qatorlar: Qator[]) {
  for (let i = 0; i < qatorlar.length; i += 2000)
    await prisma.ballTarix.createMany({ data: qatorlar.slice(i, i + 2000), skipDuplicates: true });
}

async function main() {
  const shablonSavollar = new Map<number, number[]>();
  for (const q of await prisma.question.findMany({ where: { status: 'published', shablon: { not: null } }, select: { id: true, shablon: true } })) {
    const r = shablonSavollar.get(q.shablon!) || [];
    r.push(q.id);
    shablonSavollar.set(q.shablon!, r);
  }

  const userlar = await prisma.user.findMany({ select: { id: true } });
  console.log(`Jami ${userlar.length} foydalanuvchi`);
  let n = 0;

  for (const { id: userId } of userlar) {
    const javoblar = await prisma.userAnswer.findMany({
      where: { userId },
      orderBy: { answeredAt: 'asc' },
      select: { questionId: true, isCorrect: true, answeredAt: true },
    });
    const qatorlar: Qator[] = [];
    const togri = new Set<number>();
    const kunlar = new Set<string>();
    const oxirgi = new Map<number, boolean>();
    for (const a of javoblar) {
      if (a.isCorrect && !togri.has(a.questionId)) {
        togri.add(a.questionId);
        qatorlar.push({ userId, sabab: 'javob', miqdor: BALL.javob, kalit: `javob:${a.questionId}`, vaqt: a.answeredAt });
      }
      const k = kun(a.answeredAt);
      if (!kunlar.has(k)) {
        kunlar.add(k);
        qatorlar.push({ userId, sabab: 'faollik', miqdor: BALL.faollik, kalit: `faollik:${k}`, vaqt: a.answeredAt });
      }
      oxirgi.set(a.questionId, a.isCorrect); // vaqt bo'yicha o'sib boradi — oxirgisi qoladi
    }
    for (const [sh, idlar] of shablonSavollar) {
      if (!idlar.every((q) => oxirgi.has(q))) continue;
      if (idlar.filter((q) => !oxirgi.get(q)).length < 3)
        qatorlar.push({ userId, sabab: 'shablon', miqdor: BALL.shablon, kalit: `shablon:${sh}`, vaqt: new Date() });
    }
    const janglar = await prisma.oktagonJang.findMany({ where: { holat: 'tugadi', OR: [{ p1Id: userId }, { p2Id: userId }] } });
    for (const j of janglar) {
      const ozg = j.p1Id === userId ? j.p1Ozgarish : j.p2Ozgarish; // +3 g'alaba, +1 durang, −1, −2 chiqdi
      if (ozg == null || ozg === -2) continue;
      const vaqt = j.tugadi || j.boshlandi;
      qatorlar.push({ userId, sabab: 'oktagon', miqdor: BALL.oktagonJang, kalit: `oktagon:${kun(vaqt)}:${j.id}`, vaqt });
      if (ozg === 3) qatorlar.push({ userId, sabab: 'oktagon-galaba', miqdor: BALL.oktagonGalaba, kalit: `oktagon-galaba:${kun(vaqt)}:${j.id}`, vaqt });
    }
    if (qatorlar.length) await yoz(qatorlar);
    const jami = await prisma.ballTarix.aggregate({ where: { userId }, _sum: { miqdor: true } });
    await prisma.user.update({ where: { id: userId }, data: { ball: jami._sum.miqdor ?? 0 } });
    if (++n % 50 === 0) console.log(`  ${n}/${userlar.length}`);
  }

  const top = await prisma.user.findMany({ orderBy: { ball: 'desc' }, take: 5, select: { firstName: true, ball: true } });
  console.log('Tayyor. Eng ko‘p ball:', top.map((u) => `${u.firstName} ${u.ball}`).join(', '));
}

main().finally(() => prisma.$disconnect());
