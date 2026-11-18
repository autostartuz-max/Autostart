import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireUser } from '../auth';
import { keshla } from '../kesh';

/** 3D avtodrom simulyatori: sozlamalar va natijalar */
export const simRouter = Router();
/** Admin: /api/admin/sim (requireAdmin index.ts da) */
export const simAdminRouter = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

/** Sozlama bitta yozuv — 60 s keshlanadi (har bir imtihon boshida so'raladi) */
const sozlamaKesh = keshla(60_000, async () => {
  const r = await prisma.simSozlama.findUnique({ where: { id: 1 } });
  return { sozlama: (r?.data as any) ?? null, yangilangan: r?.updatedAt ?? null };
});

simRouter.use(requireUser);

simRouter.get(
  '/sozlama',
  ah(async (_req, res) => {
    const s = await sozlamaKesh();
    // rasmiy: false — jarima ballari rasmiy jadvalga asoslanmagan (admin tasdiqlamaguncha)
    res.json({ ...s, rasmiy: !!s.sozlama?.rasmiy });
  })
);

const son = (x: any, min: number, max: number) => {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const matn = (x: any, uzun: number) => (typeof x === 'string' ? x.slice(0, uzun) : '');

simRouter.post(
  '/natija',
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const b = req.body || {};
    // Bir foydalanuvchidan juda tez-tez yozuvni cheklash (3 soniya)
    const oxirgi = await prisma.simNatija.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    if (oxirgi && Date.now() - oxirgi.createdAt.getTime() < 3000) return res.status(429).json({ error: 'Juda tez' });
    const xatolar = (Array.isArray(b.xatolar) ? b.xatolar : []).slice(0, 200).map((j: any) => ({
      kod: matn(j?.kod, 40), nom: matn(j?.nom, 120), ball: son(j?.ball, 0, 1000), mashq: matn(j?.mashq, 120), izoh: j?.izoh ? matn(j.izoh, 200) : null,
    }));
    const r = await prisma.simNatija.create({
      data: {
        userId,
        rejim: b.rejim === 'mashq' ? 'mashq' : 'imtihon',
        mashq: b.mashq ? matn(b.mashq, 40) : null,
        mashina: matn(b.mashina, 40) || 'cobalt',
        jami: son(b.jami, 0, 100000),
        otdi: !!b.otdi,
        vaqt: son(b.vaqt, 0, 24 * 3600),
        bajarildi: son(b.bajarildi, 0, 100),
        jamiQadam: son(b.jamiQadam, 0, 100),
        sabab: matn(b.sabab, 200),
        xatolar,
      },
      select: { id: true },
    });
    res.json(r);
  })
);

simRouter.get(
  '/natijalarim',
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const r = await prisma.simNatija.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: 30,
      select: { id: true, rejim: true, mashq: true, mashina: true, jami: true, otdi: true, vaqt: true, bajarildi: true, jamiQadam: true, createdAt: true },
    });
    res.json(r);
  })
);

/* ───────────── Admin ───────────── */

simAdminRouter.get(
  '/sozlama',
  ah(async (_req, res) => {
    const r = await prisma.simSozlama.findUnique({ where: { id: 1 } });
    res.json({ sozlama: (r?.data as any) ?? null, yangilangan: r?.updatedAt ?? null });
  })
);

simAdminRouter.put(
  '/sozlama',
  ah(async (req, res) => {
    const data = req.body?.sozlama;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'Sozlama noto‘g‘ri' });
    if (JSON.stringify(data).length > 50_000) return res.status(400).json({ error: 'Sozlama juda katta' });
    const r = await prisma.simSozlama.upsert({ where: { id: 1 }, create: { id: 1, data }, update: { data } });
    sozlamaKesh.tozala();
    res.json({ sozlama: r.data, yangilangan: r.updatedAt });
  })
);

simAdminRouter.get(
  '/natijalar',
  ah(async (req, res) => {
    const SAHIFA = 50;
    const sahifa = Math.max(1, Math.trunc(Number(req.query.sahifa) || 1));
    const [jami, natijalar, statistika] = await Promise.all([
      prisma.simNatija.count(),
      prisma.simNatija.findMany({
        orderBy: { createdAt: 'desc' }, skip: (sahifa - 1) * SAHIFA, take: SAHIFA,
        select: {
          id: true, rejim: true, mashq: true, mashina: true, jami: true, otdi: true, vaqt: true, bajarildi: true, jamiQadam: true,
          sabab: true, xatolar: true, createdAt: true,
          user: { select: { id: true, firstName: true, phone: true, email: true } },
        },
      }),
      prisma.simNatija.groupBy({ by: ['otdi'], where: { rejim: 'imtihon' }, _count: { _all: true } }),
    ]);
    const otdi = statistika.find((s) => s.otdi)?._count._all ?? 0;
    const otmadi = statistika.find((s) => !s.otdi)?._count._all ?? 0;
    res.json({ jami, sahifa, sahifaHajmi: SAHIFA, natijalar, imtihon: { otdi, otmadi } });
  })
);
