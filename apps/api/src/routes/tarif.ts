import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireUser } from '../auth';
import { telegramgaYubor } from '../notify';
import {
  TARIFLAR, IMKONIYAT_DARAJA, TOLOV_KONTAKT, tarifTop, tarifDarajasi, mediaKalit, ilovaMatnlari, matnlarBirlashtir, STANDART_MATNLAR,
  variantNarx, variantNomi, sorovKodi, sorovTahlil,
} from '../tarif';

/** So'rov yozuvi mijozga: `tarif` — sof kod (eski ilovalar shuni kutadi), muddat va do'stlar alohida */
const sorovJson = <T extends { tarif: string }>(s: T) => {
  const v = sorovTahlil(s.tarif);
  return { ...s, tarif: v.kod, oy: v.oy, dostlar: v.dostlar };
};

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
      sorov: sorov ? sorovJson(sorov) : null,
      kontakt: TOLOV_KONTAKT,
    });
  })
);

/** "Sotib olish": so'rov qoldiriladi, admin to'lovni qabul qilib tarifni yoqadi.
 *  { tarif, oy?: 1 | 3, dostlar?: boolean } — eski ilovalar faqat { tarif } yuboradi (1 oy deb olinadi). */
tarifRouter.post(
  '/sorov',
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const t = tarifTop(String(req.body?.tarif || ''));
    if (!t) return res.status(400).json({ error: 'Tarif topilmadi' });
    const oy = Number(req.body?.oy) === 3 ? 3 : 1;
    const dostlar = !!req.body?.dostlar && !!t.dostlar;
    const kodi = sorovKodi(t.kod, oy, dostlar);
    // Bir kunda bir xil variantga takroriy so'rov yozilmaydi
    const bor = await prisma.tarifSorov.findFirst({ where: { userId, tarif: kodi, holat: 'yangi', createdAt: { gt: new Date(Date.now() - 86400_000) } } });
    if (!bor) {
      await prisma.tarifSorov.create({ data: { userId, tarif: kodi } });
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, phone: true, email: true } });
      telegramgaYubor(
        `\u{1F4B3} <b>Tarif so'rovi: ${esc(variantNomi(t, oy, dostlar))}</b> — ${narxMatn(variantNarx(t, oy, dostlar))}\n\n` +
          `\u{1F464} ${esc(u?.firstName || '')} (ID ${userId})\n` +
          (u?.phone ? `\u{1F4DE} ${esc(u.phone)}\n` : '') + (u?.email ? `✉️ ${esc(u.email)}\n` : '') +
          (dostlar ? `\n\u{1F465} Do‘stlar tarifi: do‘stlarining telefon raqamlarini so‘rang — admin panelda birga yoqiladi.\n` : '') +
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
    res.json({
      tariflar: TARIFLAR,
      sorovlar: sorovlar.map(sorovJson),
      obunalar,
      faol: Object.fromEntries(faolSoni.map((f) => [f.tarif, f._count._all])),
    });
  })
);

/**
 * Foydalanuvchi qidiruvi — tarif yoqish va Do'stlar tarifi uchun (ism, telefon, pochta yoki ID).
 * /api/admin/users faqat Owner'ga ochiq — Admin ham tarif yoqa olishi uchun shu yerda alohida, kam maydon bilan.
 */
tarifAdminRouter.get(
  '/foydalanuvchilar',
  ah(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (q.length < 2) return res.json({ users: [] });
    const variantlar = /['ʻʼ’‘`]/.test(q) ? ["'", 'ʻ', 'ʼ', '’', '‘', '`'].map((t) => q.replace(/['ʻʼ’‘`]/g, t)) : [q];
    const OR: any[] = variantlar.flatMap((v) => [
      { firstName: { contains: v, mode: 'insensitive' as const } },
      { email: { contains: v, mode: 'insensitive' as const } },
    ]);
    const raqam = q.replace(/\D/g, '');
    if (raqam.length >= 2) OR.push({ phone: { contains: raqam } });
    if (/^\d{1,9}$/.test(q)) OR.push({ id: Number(q) });
    const users = await prisma.user.findMany({
      where: { OR }, select: { id: true, firstName: true, phone: true, email: true }, orderBy: { id: 'desc' }, take: 12,
    });
    res.json({ users });
  })
);

/**
 * Tarifni yoqish: { userId, tarif, oy?, narx?, izoh?, sorovId?, dostlar?, dostlarId?: number[] }.
 * Faol tarif bo'lsa — uning oxiridan davom etadi. Do'stlar tarifi (Premium): to'lovchi + 2 tagacha do'st,
 * hammasiga bir xil muddat; summa to'lovchining obunasiga yoziladi, do'stlarniki 0 (izohda to'lovchi).
 */
tarifAdminRouter.post(
  '/yoq',
  ah(async (req, res) => {
    const b = req.body || {};
    const userId = Number(b.userId);
    const t = tarifTop(String(b.tarif || ''));
    if (!userId || !t) return res.status(400).json({ error: 'Foydalanuvchi yoki tarif noto‘g‘ri' });
    const oy = Math.min(24, Math.max(1, Math.trunc(Number(b.oy) || 1)));
    const dostlar = !!b.dostlar && !!t.dostlar;
    const kelgan: number[] = (Array.isArray(b.dostlarId) ? (b.dostlarId as unknown[]) : []).map((x) => Number(x));
    const dostIdlar: number[] = dostlar
      ? [...new Set(kelgan)].filter((x) => Number.isInteger(x) && x > 0 && x !== userId)
      : [];
    if (dostlar && dostIdlar.length > t.dostlar!.odam - 1) {
      return res.status(400).json({ error: `Do‘stlar tarifi ${t.dostlar!.odam} kishigacha` });
    }
    const bor = await prisma.user.findMany({ where: { id: { in: [userId, ...dostIdlar] } }, select: { id: true } });
    if (!bor.some((x) => x.id === userId)) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    if (bor.length !== 1 + dostIdlar.length) return res.status(404).json({ error: 'Do‘stlardan biri topilmadi' });
    // To'langan summa: admin kiritgani, bo'lmasa variant narxi (1 oy, 3 oy chegirmali, do'stlar)
    const narx = b.narx != null && Number.isFinite(Number(b.narx)) ? Math.max(0, Math.trunc(Number(b.narx))) : variantNarx(t, oy, dostlar);
    const adminIzoh = String(b.izoh || '').trim().slice(0, 200);
    const guruh = dostlar ? `Do‘stlar tarifi (${1 + dostIdlar.length}/${t.dostlar!.odam})` : '';

    const ob = await prisma.$transaction(async (tx) => {
      const biriga = async (uid: number, summa: number, izoh: string) => {
        // Shu tarif hali faol bo'lsa — muddat uning oxiridan uzayadi
        const oxirgi = await tx.obuna.findFirst({ where: { userId: uid, tarif: t.kod, tugaydi: { gt: new Date() } }, orderBy: { tugaydi: 'desc' } });
        const boshlandi = oxirgi ? oxirgi.tugaydi : new Date();
        const tugaydi = new Date(boshlandi);
        tugaydi.setMonth(tugaydi.getMonth() + oy);
        return tx.obuna.create({ data: { userId: uid, tarif: t.kod, boshlandi, tugaydi, narx: summa, izoh: izoh.slice(0, 300) } });
      };
      const asosiy = await biriga(userId, narx, [guruh && guruh + ' — to‘lovchi', adminIzoh].filter(Boolean).join('. '));
      for (const d of dostIdlar) await biriga(d, 0, [`${guruh} — to‘lovchi ID ${userId}`, adminIzoh].filter(Boolean).join('. '));
      if (b.sorovId) await tx.tarifSorov.updateMany({ where: { id: Number(b.sorovId) }, data: { holat: 'bajarildi' } });
      else await tx.tarifSorov.updateMany({ where: { userId, tarif: { startsWith: t.kod }, holat: 'yangi' }, data: { holat: 'bajarildi' } });
      return asosiy;
    });
    res.json({ ...ob, dostlarSoni: dostIdlar.length });
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
