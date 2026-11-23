import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireUser } from '../auth';
import { telegramgaYubor } from '../notify';
import {
  TARIFLAR, IMKONIYAT_DARAJA, TOLOV_KONTAKT, tarifTop, tarifDarajasi, mediaKalit, ilovaMatnlari, matnlarBirlashtir, STANDART_MATNLAR, jamiNarx,
} from '../tarif';

/** Tariflar: /api/tarif (foydalanuvchi), /api/admin/tarif (admin — index.ts da requireAdmin) */
export const tarifRouter = Router();
export const tarifAdminRouter = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const narxMatn = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' so‘m';

tarifRouter.use(requireUser);

/** Tariflar ro'yxati, joriy tarif, media kaliti va kutilayotgan so'rov */
tarifRouter.get(
  '/',
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const [{ daraja, joriy }, sorov] = await Promise.all([
      tarifDarajasi(userId),
      prisma.tarifSorov.findFirst({ where: { userId, holat: 'yangi' }, orderBy: { createdAt: 'desc' }, select: { tarif: true, createdAt: true } }),
    ]);
    res.json({
      tariflar: TARIFLAR,
      imkoniyatDaraja: IMKONIYAT_DARAJA,
      joriy: joriy ? { kod: joriy.kod, nom: joriy.nom, tugaydi: joriy.tugaydi } : null,
      daraja,
      kalit: mediaKalit(userId, daraja),
      sorov,
      kontakt: TOLOV_KONTAKT,
    });
  })
);

/** "Sotib olish": so'rov qoldiriladi, admin to'lovni qabul qilib tarifni yoqadi */
tarifRouter.post(
  '/sorov',
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const t = tarifTop(String(req.body?.tarif || ''));
    if (!t) return res.status(400).json({ error: 'Tarif topilmadi' });
    // Bir kunda bir xil tarifga takroriy so'rov yozilmaydi
    const bor = await prisma.tarifSorov.findFirst({ where: { userId, tarif: t.kod, holat: 'yangi', createdAt: { gt: new Date(Date.now() - 86400_000) } } });
    if (!bor) {
      await prisma.tarifSorov.create({ data: { userId, tarif: t.kod } });
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, phone: true, email: true } });
      telegramgaYubor(
        `\u{1F4B3} <b>Tarif so'rovi: ${esc(t.nom)}</b> — ${narxMatn(jamiNarx(t))} (${t.oy} oy × ${narxMatn(t.narx)})\n\n` +
          `\u{1F464} ${esc(u?.firstName || '')} (ID ${userId})\n` +
          (u?.phone ? `\u{1F4DE} ${esc(u.phone)}\n` : '') + (u?.email ? `✉️ ${esc(u.email)}\n` : '') +
          '\nTo‘lovdan keyin: <a href="https://autostart.uz/tariflar/boshqaruv">admin panelda yoqing</a>'
      ).catch(() => { /* xabarnoma muhim emas */ });
    }
    res.json({ ok: true, kontakt: TOLOV_KONTAKT });
  })
);

/** Ilova matnlari: bayram tabriklari, eslatmalar, reklama (har kim o'qiydi) */
tarifRouter.get('/matnlar', ah(async (_req, res) => res.json(await ilovaMatnlari())));

/* ───────────── Admin ───────────── */

tarifAdminRouter.get(
  '/',
  ah(async (_req, res) => {
    const userSel = { select: { id: true, firstName: true, phone: true, email: true } };
    const [sorovlar, obunalar, faolSoni] = await Promise.all([
      prisma.tarifSorov.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { user: userSel } }),
      prisma.obuna.findMany({ orderBy: { createdAt: 'desc' }, take: 300, include: { user: userSel } }),
      prisma.obuna.groupBy({ by: ['tarif'], where: { tugaydi: { gt: new Date() } }, _count: { _all: true } }),
    ]);
    res.json({ tariflar: TARIFLAR, sorovlar, obunalar, faol: Object.fromEntries(faolSoni.map((f) => [f.tarif, f._count._all])) });
  })
);

/** Tarifni yoqish: { userId, tarif, oy?, narx?, izoh?, sorovId? }. Faol tarif bo'lsa — uning oxiridan davom etadi. */
tarifAdminRouter.post(
  '/yoq',
  ah(async (req, res) => {
    const b = req.body || {};
    const userId = Number(b.userId);
    const t = tarifTop(String(b.tarif || ''));
    if (!userId || !t) return res.status(400).json({ error: 'Foydalanuvchi yoki tarif noto‘g‘ri' });
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    const oy = Math.min(24, Math.max(1, Math.trunc(Number(b.oy) || t.oy)));
    // Shu tarif hali faol bo'lsa — muddat uning oxiridan uzayadi
    const oxirgi = await prisma.obuna.findFirst({ where: { userId, tarif: t.kod, tugaydi: { gt: new Date() } }, orderBy: { tugaydi: 'desc' } });
    const boshlandi = oxirgi ? oxirgi.tugaydi : new Date();
    const tugaydi = new Date(boshlandi);
    tugaydi.setMonth(tugaydi.getMonth() + oy);
    // To'langan summa: admin kiritgani, bo'lmasa oylik narx × oylar
    const narx = b.narx != null && Number.isFinite(Number(b.narx)) ? Math.max(0, Math.trunc(Number(b.narx))) : jamiNarx(t, oy);
    const ob = await prisma.obuna.create({ data: { userId, tarif: t.kod, boshlandi, tugaydi, narx, izoh: String(b.izoh || '').slice(0, 300) } });
    if (b.sorovId) await prisma.tarifSorov.updateMany({ where: { id: Number(b.sorovId) }, data: { holat: 'bajarildi' } });
    else await prisma.tarifSorov.updateMany({ where: { userId, tarif: t.kod, holat: 'yangi' }, data: { holat: 'bajarildi' } });
    res.json(ob);
  })
);

/** Obunani bekor qilish (darhol tugatish) */
tarifAdminRouter.post(
  '/obuna/:id/bekor',
  ah(async (req, res) => {
    const r = await prisma.obuna.updateMany({ where: { id: Number(req.params.id) }, data: { tugaydi: new Date() } });
    res.json({ ok: r.count > 0 });
  })
);

/** So'rov holati: yangi | bajarildi | bekor */
tarifAdminRouter.post(
  '/sorov/:id',
  ah(async (req, res) => {
    const holat = String(req.body?.holat || '');
    if (!['yangi', 'bajarildi', 'bekor'].includes(holat)) return res.status(400).json({ error: 'Holat noto‘g‘ri' });
    await prisma.tarifSorov.updateMany({ where: { id: Number(req.params.id) }, data: { holat } });
    res.json({ ok: true });
  })
);

/** Ilova matnlari (bayramlar, eslatmalar, reklama) */
tarifAdminRouter.get(
  '/matnlar',
  ah(async (_req, res) => {
    const r = await prisma.ilovaSozlama.findUnique({ where: { id: 1 } });
    res.json({ matnlar: matnlarBirlashtir(r?.data), standart: STANDART_MATNLAR, yangilangan: r?.updatedAt ?? null });
  })
);

tarifAdminRouter.put(
  '/matnlar',
  ah(async (req, res) => {
    const data = matnlarBirlashtir(req.body?.matnlar);
    const r = await prisma.ilovaSozlama.upsert({ where: { id: 1 }, create: { id: 1, data: data as any }, update: { data: data as any } });
    ilovaMatnlari.tozala();
    res.json({ matnlar: matnlarBirlashtir(r.data), yangilangan: r.updatedAt });
  })
);
