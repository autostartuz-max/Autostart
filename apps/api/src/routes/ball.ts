import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireUser } from '../auth';
import { BALL, KUNLIK_IMTIHON, ballQosh, bugungiSoni, daraja, kun, promoKodi, streak } from '../ball';

/** Daraja tizimi: ball, daraja, promokod (/api/ball) */
export const ballRouter = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

ballRouter.use(requireUser);

/** "Darajam" sahifasi: ball, daraja, streak, oxirgi 7 kun, o'rin, promokod, tarix */
ballRouter.get(
  '/men',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const u = await prisma.user.findUnique({ where: { id: men }, select: { id: true, firstName: true, ball: true, createdAt: true } });
    if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const haftaOldin = new Date(Date.now() - 7 * 86400_000);
    const ikkiHafta = new Date(Date.now() - 14 * 86400_000);
    const [yetti, orinOldi, promoKod, jami, tasdiqlangan, soNggi, kunlar] = await Promise.all([
      prisma.ballTarix.aggregate({ where: { userId: men, vaqt: { gte: haftaOldin } }, _sum: { miqdor: true } }),
      prisma.user.count({ where: { ball: { gt: u.ball } } }),
      promoKodi(men),
      prisma.promoTaklif.count({ where: { egasiId: men } }),
      prisma.promoTaklif.count({ where: { egasiId: men, holat: 'tasdiqlangan' } }),
      prisma.ballTarix.findMany({
        where: { userId: men, vaqt: { gte: ikkiHafta } },
        orderBy: { vaqt: 'desc' },
        select: { sabab: true, miqdor: true, vaqt: true },
      }),
      streak(men),
    ]);

    // Tarix kun va sabab bo'yicha jamlanadi: har savol uchun alohida "+1" qatori ko'rinmasin
    const guruh = new Map<string, { kun: string; sabab: string; miqdor: number; soni: number }>();
    for (const r of soNggi) {
      const k = kun(r.vaqt) + '|' + r.sabab;
      const g = guruh.get(k) || { kun: kun(r.vaqt), sabab: r.sabab, miqdor: 0, soni: 0 };
      g.miqdor += r.miqdor;
      g.soni++;
      guruh.set(k, g);
    }

    res.json({
      id: u.id,
      ism: u.firstName,
      qoshilgan: u.createdAt,
      ball: u.ball,
      daraja: daraja(u.ball),
      streak: kunlar,
      oxirgi7: yetti._sum.miqdor ?? 0,
      orin: u.ball > 0 ? orinOldi + 1 : null,
      promoKod,
      taklif: { jami, tasdiqlangan },
      qiymatlar: BALL,
      tarix: [...guruh.values()].slice(0, 30),
    });
  })
);

/**
 * Real imtihondan o'tdi: { savollar: [id...] } — imtihondagi savollar.
 * Server o'zi tekshiradi: hammasiga oxirgi 3 soatda javob berilgan va xato 3 tadan kam.
 * Kuniga ko'pi bilan KUNLIK_IMTIHON marta.
 */
ballRouter.post(
  '/imtihon',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const idlar = [...new Set((Array.isArray(req.body?.savollar) ? req.body.savollar : []).map(Number).filter((x: number) => x > 0))] as number[];
    if (idlar.length < 20) return res.json({ ok: false });
    const javoblar = await prisma.userAnswer.findMany({
      where: { userId: men, questionId: { in: idlar }, answeredAt: { gte: new Date(Date.now() - 3 * 3600_000) } },
      orderBy: { answeredAt: 'desc' },
      select: { questionId: true, isCorrect: true },
    });
    const oxirgi = new Map<number, boolean>();
    for (const a of javoblar) if (!oxirgi.has(a.questionId)) oxirgi.set(a.questionId, a.isCorrect);
    const xato = [...oxirgi.values()].filter((x) => !x).length;
    if (oxirgi.size < idlar.length || xato >= 3) return res.json({ ok: false });
    const n = await bugungiSoni(men, 'imtihon');
    if (n >= KUNLIK_IMTIHON) return res.json({ ok: false, sabab: 'kunlik chegara' });
    const ok = await ballQosh(men, 'imtihon', BALL.imtihon, `imtihon:${kun()}:${n + 1}`);
    res.json({ ok, ball: ok ? BALL.imtihon : 0 });
  })
);

/** Amaliy mashg'ulot videosi oxirigacha ko'rildi: { lessonId } — har dars uchun bir marta */
ballRouter.post(
  '/video',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const id = Number(req.body?.lessonId);
    const dars = Number.isInteger(id) ? await prisma.lesson.findUnique({ where: { id }, select: { id: true } }) : null;
    if (!dars) return res.status(404).json({ error: 'Dars topilmadi' });
    const ok = await ballQosh(men, 'video', BALL.video, `video:${id}`);
    res.json({ ok, ball: ok ? BALL.video : 0 });
  })
);
