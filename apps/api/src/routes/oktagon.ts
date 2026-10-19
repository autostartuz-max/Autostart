import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireUser } from '../auth';

/**
 * Oktagon — jang rejimi. Ikki o'yinchi bir xil 10 ta savolga javob beradi,
 * ko'proq to'g'ri javob bergan yutadi.
 *
 * Raqib qidirish xotirada (navbat) — server bitta jarayon (pm2 fork), qayta
 * ishga tushsa navbat bo'shaydi, xolos: ilova qidirishni qaytadan boshlaydi.
 * Odam BOT_KUTISH_MS ichida topilmasa — bot raqib. Bot ochiq "Bot" deb
 * ko'rsatiladi; uning javoblari jang yaratilganda oldindan rejalashtiriladi.
 *
 * Javoblarni server tekshiradi: jang davomida savollar to'g'ri javobsiz
 * yuboriladi, to'g'ri variant faqat javobdan keyin yoki jang tugagach ochiladi.
 */
export const oktagonRouter = Router();

const ah =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const SAVOL_SONI = 10;
// Jang 3 daqiqa — shu vaqtgacha javob berilmagan savollar xato hisoblanadi
const JANG_MUDDATI_MS = 3 * 60_000;
// Shuncha kutib odam topilmasa — bot bilan jang
const BOT_KUTISH_MS = 15_000;
// Qidiruv so'rovi kelmay qo'ygan foydalanuvchi navbatdan chiqariladi
const NAVBAT_ESKIRISH_MS = 6_000;
const ONLAYN_DAQIQA = 5;

// G'alaba +3, durang +1, mag'lubiyat −1, o'yindan chiqib ketish −2
const BALL = { galaba: 3, durang: 1, maglubiyat: -1, chiqdi: -2 } as const;
type Natija = keyof typeof BALL;

export function daraja(ball: number) {
  if (ball >= 300) return 'Brilliant';
  if (ball >= 150) return 'Oltin';
  if (ball >= 50) return 'Kumush';
  return 'Bronza';
}

const BOT_ISMLAR = ['Jasur', 'Dilnoza', 'Sardor', 'Madina', 'Bekzod', 'Nilufar', 'Aziz', 'Shahnoza', 'Otabek', 'Kamola', 'Jamshid', 'Malika'];

type Javob = { i: number; togri: boolean; v?: number }; // v — tanlangan variant id
type BotQadam = { ms: number; togri: boolean };
type Jang = NonNullable<Awaited<ReturnType<typeof prisma.oktagonJang.findUnique>>>;

const javoblar = (x: unknown): Javob[] => (Array.isArray(x) ? (x as Javob[]) : []);
const muddat = (j: Jang) => j.boshlandi.getTime() + JANG_MUDDATI_MS;

/** Botning hozirgacha bergan javoblari (jang tugagan bo'lsa — hammasi) */
function botJavoblari(j: Jang, hammasi: boolean): Javob[] {
  const otgan = Date.now() - j.boshlandi.getTime();
  const reja = (Array.isArray(j.botReja) ? j.botReja : []) as BotQadam[];
  return reja.filter((r) => hammasi || r.ms <= otgan).map((r, i) => ({ i, togri: r.togri }));
}

// ---------- Savollar ----------
let savolKesh: { vaqt: number; idlar: number[] } | null = null;
async function tasodifiySavollar() {
  if (!savolKesh || Date.now() - savolKesh.vaqt > 5 * 60_000) {
    const r = await prisma.question.findMany({ where: { status: 'published' }, select: { id: true } });
    savolKesh = { vaqt: Date.now(), idlar: r.map((q) => q.id) };
  }
  const a = [...savolKesh.idlar];
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [a[i], a[k]] = [a[k], a[i]];
  }
  return a.slice(0, SAVOL_SONI);
}

async function jangYarat(p1Id: number, p2Id: number | null, botNomi?: string | null) {
  const savollar = await tasodifiySavollar();
  if (p2Id != null) return prisma.oktagonJang.create({ data: { p1Id, p2Id, savollar } });

  // Bot: aniqligi o'yinchi baliga qarab 50–85%, har savolga 3.5–9 soniya.
  // Birinchi javob ~6 soniyadan keyin — ilovadagi 4 soniyalik "vs" sanog'i ham hisobda.
  const men = await prisma.user.findUnique({ where: { id: p1Id }, select: { oktagonBall: true } });
  const aniqlik = Math.min(0.85, Math.max(0.5, 0.6 + (men?.oktagonBall ?? 0) / 1000));
  const botReja: BotQadam[] = [];
  let ms = 2500;
  for (let i = 0; i < SAVOL_SONI; i++) {
    ms += 3500 + Math.random() * 5500;
    botReja.push({ ms: Math.round(ms), togri: Math.random() < aniqlik });
  }
  const botIsm = botNomi || BOT_ISMLAR[Math.floor(Math.random() * BOT_ISMLAR.length)];
  return prisma.oktagonJang.create({ data: { p1Id, p2Id: null, botIsm, botReja, savollar } });
}

// ---------- Raqib qidirish (navbat) ----------
type Kutuvchi = { boshlandi: number; oxirgi: number; band?: boolean; jangId?: number };
const navbat = new Map<number, Kutuvchi>();

function navbatniTozala() {
  const t = Date.now();
  for (const [id, k] of navbat) {
    if (k.band) continue;
    // Jang topilgan, lekin foydalanuvchi uni olib ketmagan (ilovani yopgan)
    if (k.jangId ? t - k.oxirgi > 30_000 : t - k.oxirgi > NAVBAT_ESKIRISH_MS) navbat.delete(id);
  }
}

async function qidiruvHolati(men: number) {
  navbatniTozala();
  const k = navbat.get(men);
  if (!k) return { holat: 'yoq' as const };
  k.oxirgi = Date.now();
  if (k.jangId) {
    navbat.delete(men);
    return { holat: 'topildi' as const, jangId: k.jangId };
  }
  const soniya = Math.floor((Date.now() - k.boshlandi) / 1000);
  // Boshqa o'yinchi bizni hozir juftlayapti — jang yaratilishini kutamiz
  if (k.band) return { holat: 'kutmoqda' as const, soniya };

  // Kutayotgan boshqa odam bormi? Juftlash SINXRON belgilanadi (band) —
  // bir vaqtda ikki kishi bitta raqibni olib qo'ymasligi uchun.
  const topildi = [...navbat.entries()].find(([id, x]) => id !== men && !x.band && !x.jangId);
  if (topildi) {
    const [raqibId, rk] = topildi;
    rk.band = true;
    navbat.delete(men);
    try {
      const jang = await jangYarat(raqibId, men);
      rk.jangId = jang.id;
      return { holat: 'topildi' as const, jangId: jang.id };
    } catch (e) {
      navbat.set(men, k);
      throw e;
    } finally {
      rk.band = false;
    }
  }

  if (Date.now() - k.boshlandi > BOT_KUTISH_MS) {
    k.band = true;
    try {
      const jang = await jangYarat(men, null);
      navbat.delete(men);
      return { holat: 'topildi' as const, jangId: jang.id };
    } finally {
      k.band = false;
    }
  }
  return { holat: 'kutmoqda' as const, soniya };
}

// ---------- Do'stni jangga chaqirish (6 xonali taklif kodi) ----------
const TAKLIF_MUDDATI_MS = 10 * 60_000;
type Taklif = { egasi: number; yaratildi: number; oxirgi: number; jangId?: number };
const takliflar = new Map<string, Taklif>(); // kod → taklif
const egasiKodi = new Map<number, string>(); // foydalanuvchi → uning faol kodi

function takliflarniTozala() {
  const t = Date.now();
  for (const [kod, x] of takliflar) {
    // Muddat tugagan, egasi kutishni to'xtatgan yoki jang allaqachon olib ketilgan
    const eski = t - x.yaratildi > TAKLIF_MUDDATI_MS || t - x.oxirgi > (x.jangId ? 60_000 : 30_000);
    if (!eski) continue;
    takliflar.delete(kod);
    if (egasiKodi.get(x.egasi) === kod) egasiKodi.delete(x.egasi);
  }
}

function yangiKod() {
  let k: string;
  do k = String(Math.floor(100000 + Math.random() * 900000));
  while (takliflar.has(k));
  return k;
}

// ---------- Jang paytidagi emoji ----------
const EMOJILAR = ['👍', '😂', '😮', '😡', '🔥', '👏', '😎', '🤔'];
type EmojiXabar = { n: number; tomon: 1 | 2; e: string; vaqt: number };
const jangEmojilari = new Map<number, EmojiXabar[]>();
let emojiN = 0;
function emojiQosh(jangId: number, tomon: 1 | 2, e: string, kechikish = 0) {
  const r = jangEmojilari.get(jangId) || [];
  r.push({ n: ++emojiN, tomon, e, vaqt: Date.now() + kechikish });
  jangEmojilari.set(jangId, r.slice(-10));
}

// ---------- Odam bilan qasos (tugagan jang → yangi jang o'sha ikki kishi o'rtasida) ----------
const QASOS_MUDDATI_MS = 60_000;
// soruvchi — qasos so'ragan tomon; oxirgi — u natija oynasida hali turibdimi
type Qasos = { soruvchi: 1 | 2; vaqt: number; oxirgi: number; jangId?: number };
const qasoslar = new Map<number, Qasos>(); // eski jang id → so'rov

// Xotiradagi eski yozuvlarni vaqti-vaqti bilan tozalash (tashlab ketilgan janglar)
setInterval(() => {
  const t = Date.now();
  takliflarniTozala();
  for (const [id, r] of jangEmojilari) if (!r.length || t - r[r.length - 1].vaqt > 10 * 60_000) jangEmojilari.delete(id);
  for (const [id, q] of qasoslar) if (t - q.vaqt > 5 * 60_000) qasoslar.delete(id);
}, 5 * 60_000).unref();

// ---------- Jangni yakunlash ----------
function tugashiKerak(j: Jang) {
  if (Date.now() > muddat(j)) return true;
  const p1Tayyor = javoblar(j.p1Javob).length >= SAVOL_SONI || j.p1Chiqdi;
  // Bot jangi: odam tugatsa (yoki chiqsa) — botning qolgan javoblari darhol ochiladi
  const p2Tayyor = j.p2Id == null ? p1Tayyor : javoblar(j.p2Javob).length >= SAVOL_SONI || j.p2Chiqdi;
  return p1Tayyor && p2Tayyor;
}

async function yakunla(j: Jang): Promise<Jang> {
  const a = javoblar(j.p1Javob);
  const b = j.p2Id == null ? botJavoblari(j, true) : javoblar(j.p2Javob);
  const t1 = a.filter((x) => x.togri).length;
  const t2 = b.filter((x) => x.togri).length;
  const natija = (chiqdi: boolean, raqibChiqdi: boolean, men: number, u: number): Natija =>
    chiqdi ? 'chiqdi' : raqibChiqdi ? 'galaba' : men > u ? 'galaba' : men === u ? 'durang' : 'maglubiyat';
  const d1 = BALL[natija(j.p1Chiqdi, j.p2Chiqdi, t1, t2)];
  const d2 = j.p2Id == null ? null : BALL[natija(j.p2Chiqdi, j.p1Chiqdi, t2, t1)];

  // Faqat bitta so'rov yakunlaydi (ikki o'yinchi bir vaqtda so'rasa ball ikki marta qo'shilmasin)
  const r = await prisma.oktagonJang.updateMany({
    where: { id: j.id, holat: 'jang' },
    data: { holat: 'tugadi', tugadi: new Date(), p1Ozgarish: d1, p2Ozgarish: d2 },
  });
  if (r.count) {
    const ball = (id: number, d: number) =>
      prisma.user
        .update({ where: { id }, data: { oktagonBall: { increment: d }, oktagonJang: { increment: 1 } } })
        .catch(() => {}); // o'yinchi akkauntini o'chirgan bo'lishi mumkin
    await ball(j.p1Id, d1);
    if (j.p2Id != null && d2 != null) await ball(j.p2Id, d2);
  }
  return (await prisma.oktagonJang.findUnique({ where: { id: j.id } }))!;
}

// Bir jangga javoblar ketma-ket yoziladi (JSON ustun — o'qib, qo'shib, yozish)
const qulflar = new Map<number, Promise<unknown>>();
function navbatda<T>(jangId: number, ish: () => Promise<T>): Promise<T> {
  const oldingi = qulflar.get(jangId) || Promise.resolve();
  const keyingi = oldingi.catch(() => {}).then(ish);
  qulflar.set(jangId, keyingi);
  keyingi.finally(() => qulflar.get(jangId) === keyingi && qulflar.delete(jangId)).catch(() => {});
  return keyingi;
}

async function jangniOl(req: Request, res: Response) {
  const men = (req as any).userId as number;
  const id = Number(req.params.id);
  const j = Number.isInteger(id) ? await prisma.oktagonJang.findUnique({ where: { id } }) : null;
  if (!j) {
    res.status(404).json({ error: 'Jang topilmadi' });
    return null;
  }
  const tomon = men === j.p1Id ? 1 : men === j.p2Id ? 2 : 0;
  if (!tomon) {
    res.status(403).json({ error: 'Bu jang sizniki emas' });
    return null;
  }
  return { j, tomon, men };
}

// ---------- Marshrutlar ----------
oktagonRouter.use(requireUser);

/** Asosiy ekran: ball, daraja, janglar soni, hozir onlayn */
oktagonRouter.get(
  '/men',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const u = await prisma.user.findUnique({ where: { id: men }, select: { oktagonBall: true, oktagonJang: true } });
    const onlayn = await prisma.user.count({
      where: { lastSeen: { gte: new Date(Date.now() - ONLAYN_DAQIQA * 60_000) } },
    });
    const ball = u?.oktagonBall ?? 0;
    res.json({ ball, daraja: daraja(ball), janglar: u?.oktagonJang ?? 0, onlayn });
  })
);

oktagonRouter.post(
  '/qidir',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const t = Date.now();
    const k = navbat.get(men);
    // Allaqachon navbatda (ikkinchi bosish) — vaqt qayta boshlanmasin
    if (!k) navbat.set(men, { boshlandi: t, oxirgi: t });
    res.json(await qidiruvHolati(men));
  })
);

oktagonRouter.get(
  '/qidir',
  ah(async (req, res) => res.json(await qidiruvHolati((req as any).userId as number)))
);

/** Qidirishni bekor qilish. Shu orada raqib topilgan bo'lsa — jangId qaytadi */
oktagonRouter.delete(
  '/qidir',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const k = navbat.get(men);
    if (k?.jangId) {
      navbat.delete(men);
      return res.json({ ok: true, jangId: k.jangId });
    }
    if (k && !k.band) navbat.delete(men);
    res.json({ ok: true, jangId: null });
  })
);

/** Jang holati. ?savol=1 — savollar ham (jang tugagach to'g'ri javoblari bilan) */
oktagonRouter.get(
  '/jang/:id',
  ah(async (req, res) => {
    const ol = await jangniOl(req, res);
    if (!ol) return;
    let { j } = ol;
    const { tomon } = ol;
    if (j.holat === 'jang' && tugashiKerak(j)) {
      // Qulf ichida yangidan o'qiymiz — shu orada yozilgan javob ham natijaga kirsin
      j = await navbatda(j.id, async () => {
        const f = (await prisma.oktagonJang.findUnique({ where: { id: ol.j.id } }))!;
        return f.holat === 'jang' && tugashiKerak(f) ? yakunla(f) : f;
      });
    }
    const tugadi = j.holat === 'tugadi';

    const userlar = await prisma.user.findMany({
      where: { id: { in: [j.p1Id, j.p2Id].filter((x): x is number => x != null) } },
      select: { id: true, firstName: true, oktagonBall: true },
    });
    const u = (id: number | null) => userlar.find((x) => x.id === id);
    const menId = tomon === 1 ? j.p1Id : j.p2Id;
    const raqibId = tomon === 1 ? j.p2Id : j.p1Id;
    const meniki = javoblar(tomon === 1 ? j.p1Javob : j.p2Javob);
    const raqibniki = j.p2Id == null ? botJavoblari(j, tugadi) : javoblar(tomon === 1 ? j.p2Javob : j.p1Javob);
    const menU = u(menId);
    const raqibU = u(raqibId);
    const bot = j.p2Id == null;
    const menBall = menU?.oktagonBall ?? 0;
    const raqibBall = bot ? menBall : raqibU?.oktagonBall ?? 0;
    const ozgarish = tomon === 1 ? j.p1Ozgarish : j.p2Ozgarish;
    const chiqdi = tomon === 1 ? j.p1Chiqdi : j.p2Chiqdi;
    const menT = meniki.filter((x) => x.togri).length;
    const raqibT = raqibniki.filter((x) => x.togri).length;

    let savollar: any[] | undefined;
    if (req.query.savol === '1') {
      const idlar = j.savollar as number[];
      const qs = await prisma.question.findMany({
        where: { id: { in: idlar } },
        select: {
          id: true, textLat: true, textCyr: true, textRus: true, imageUrl: true,
          options: {
            orderBy: { order: 'asc' },
            select: { id: true, textLat: true, textCyr: true, textRus: true, isCorrect: true },
          },
        },
      });
      // Jang davomida to'g'ri javob yuborilmaydi
      savollar = idlar
        .map((id) => qs.find((q) => q.id === id))
        .filter(Boolean)
        .map((q: any) => ({
          ...q,
          options: q.options.map((o: any) => (tugadi ? o : { ...o, isCorrect: undefined })),
        }));
    }

    res.json({
      id: j.id,
      holat: j.holat,
      savolSoni: SAVOL_SONI,
      qolganMs: Math.max(0, muddat(j) - Date.now()),
      men: { ism: menU?.firstName || 'Siz', ball: menBall, daraja: daraja(menBall), javoblar: meniki, togri: menT },
      raqib: {
        ism: bot ? j.botIsm || 'Bot' : raqibU?.firstName || 'O‘chirilgan',
        bot,
        daraja: daraja(raqibBall),
        javobSoni: raqibniki.length,
        // Raqibning qaysi savolda to'g'ri/xato qilgani — faqat jang tugagach
        javoblar: tugadi ? raqibniki : undefined,
        togri: tugadi ? raqibT : undefined,
      },
      natija: tugadi
        ? {
            ozgarish: ozgarish ?? 0,
            holat: chiqdi ? 'chiqdi' : menT > raqibT ? 'galaba' : menT === raqibT ? 'durang' : 'maglubiyat',
          }
        : null,
      // Oxirgi 6 soniyadagi emojilar (botning javobi kechiktirib qo'yiladi — vaqti kelgani)
      emoji: (jangEmojilari.get(j.id) || [])
        .filter((x) => x.vaqt <= Date.now() && Date.now() - x.vaqt < 6000)
        .map((x) => ({ n: x.n, men: x.tomon === tomon, e: x.e })),
      savollar,
    });
  })
);

/** Javob: { i — savol tartibi (0..9), variantId } → { togri, togriVariant } */
oktagonRouter.post(
  '/jang/:id/javob',
  ah(async (req, res) => {
    const ol = await jangniOl(req, res);
    if (!ol) return;
    const i = Number(req.body?.i);
    const variantId = Number(req.body?.variantId);
    await navbatda(ol.j.id, async () => {
      // Qulf ichida yangidan o'qiymiz — oldingi javob yozilgan bo'lsin
      const j = (await prisma.oktagonJang.findUnique({ where: { id: ol.j.id } }))!;
      if (j.holat !== 'jang' || Date.now() > muddat(j)) {
        if (j.holat === 'jang') await yakunla(j);
        return res.json({ tugadi: true });
      }
      const meniki = javoblar(ol.tomon === 1 ? j.p1Javob : j.p2Javob);
      if (i !== meniki.length) return res.status(409).json({ error: 'Savol tartibi mos emas' });
      const savolId = (j.savollar as number[])[i];
      const variantlar = await prisma.option.findMany({ where: { questionId: savolId }, select: { id: true, isCorrect: true } });
      const tanlangan = variantlar.find((o) => o.id === variantId);
      if (!tanlangan) return res.status(400).json({ error: 'Variant topilmadi' });
      meniki.push({ i, togri: tanlangan.isCorrect, v: tanlangan.id });
      const yangi = await prisma.oktagonJang.update({
        where: { id: j.id },
        data: ol.tomon === 1 ? { p1Javob: meniki } : { p2Javob: meniki },
      });
      if (tugashiKerak(yangi)) await yakunla(yangi);
      res.json({ togri: tanlangan.isCorrect, togriVariant: variantlar.find((o) => o.isCorrect)?.id ?? null });
    });
  })
);

/** Jangdan chiqib ketish (−2 ball) */
oktagonRouter.post(
  '/jang/:id/chiqish',
  ah(async (req, res) => {
    const ol = await jangniOl(req, res);
    if (!ol) return;
    await navbatda(ol.j.id, async () => {
      const j = (await prisma.oktagonJang.findUnique({ where: { id: ol.j.id } }))!;
      if (j.holat === 'jang') {
        const yangi = await prisma.oktagonJang.update({
          where: { id: j.id },
          data: ol.tomon === 1 ? { p1Chiqdi: true } : { p2Chiqdi: true },
        });
        if (tugashiKerak(yangi)) await yakunla(yangi);
      }
    });
    res.json({ ok: true });
  })
);

/** Jang paytida emoji yuborish: { e } — ruxsat etilganlardan biri */
oktagonRouter.post(
  '/jang/:id/emoji',
  ah(async (req, res) => {
    const ol = await jangniOl(req, res);
    if (!ol) return;
    const e = String(req.body?.e || '');
    if (!EMOJILAR.includes(e)) return res.status(400).json({ error: 'Bunday emoji yo‘q' });
    if (ol.j.holat !== 'jang') return res.json({ ok: false });
    const tomon = ol.tomon as 1 | 2;
    const oxirgi = (jangEmojilari.get(ol.j.id) || []).filter((x) => x.tomon === tomon).pop();
    if (oxirgi && Date.now() - oxirgi.vaqt < 1500) return res.status(429).json({ error: 'Biroz kuting' });
    emojiQosh(ol.j.id, tomon, e);
    // Bot ham ba'zan javob qaytaradi (1–3 soniyadan keyin)
    if (ol.j.p2Id == null && Math.random() < 0.5)
      emojiQosh(ol.j.id, 2, EMOJILAR[Math.floor(Math.random() * EMOJILAR.length)], 1200 + Math.random() * 1800);
    res.json({ ok: true });
  })
);

/**
 * Qasos olish. Bot jangi — o'sha bot bilan darhol yangi jang.
 * Odam bilan — ikkinchi tomon rozi bo'lishi kerak: birinchi bosgan so'rov
 * qoldiradi, ikkinchisi bosganda (yoki "Qabul qilish") yangi jang yaratiladi.
 * Javob: { jangId } yoki { kutmoqda: true }.
 */
oktagonRouter.post(
  '/jang/:id/qasos',
  ah(async (req, res) => {
    const ol = await jangniOl(req, res);
    if (!ol) return;
    const { j } = ol;
    const tomon = ol.tomon as 1 | 2;
    if (j.p2Id == null) {
      const jang = await jangYarat(ol.men, null, j.botIsm);
      return res.json({ jangId: jang.id });
    }
    if (j.holat !== 'tugadi') return res.status(400).json({ error: 'Jang hali tugamagan' });

    const t = Date.now();
    const q = qasoslar.get(j.id);
    if (q?.jangId && q.jangId > 0) return res.json({ jangId: q.jangId });
    // Raqib allaqachon so'ragan va natija oynasida kutib turibdi — yangi jang
    if (q && q.soruvchi !== tomon && !q.jangId && t - q.vaqt < QASOS_MUDDATI_MS) {
      if (t - q.oxirgi > 8000) {
        qasoslar.delete(j.id);
        return res.status(410).json({ error: 'Raqib chiqib ketgan' });
      }
      q.jangId = -1; // band — ikki so'rov bir vaqtda ikki jang yaratmasin
      try {
        const soruvchiId = q.soruvchi === 1 ? j.p1Id : j.p2Id;
        const jang = await jangYarat(soruvchiId, ol.men);
        q.jangId = jang.id;
        return res.json({ jangId: jang.id });
      } catch (e) {
        q.jangId = undefined;
        throw e;
      }
    }
    qasoslar.set(j.id, { soruvchi: tomon, vaqt: t, oxirgi: t });
    res.json({ kutmoqda: true });
  })
);

/** Qasos holati (natija oynasi so'raydi): yoq | men (men so'radim) | raqib (raqib so'radi) | tayyor */
oktagonRouter.get(
  '/jang/:id/qasos',
  ah(async (req, res) => {
    const ol = await jangniOl(req, res);
    if (!ol) return;
    const q = qasoslar.get(ol.j.id);
    if (!q || (!q.jangId && Date.now() - q.vaqt > QASOS_MUDDATI_MS)) return res.json({ holat: 'yoq' });
    if (q.jangId && q.jangId > 0) return res.json({ holat: 'tayyor', jangId: q.jangId });
    if (q.soruvchi === ol.tomon) {
      q.oxirgi = Date.now();
      return res.json({ holat: 'men' });
    }
    res.json({ holat: 'raqib' });
  })
);

oktagonRouter.delete(
  '/jang/:id/qasos',
  ah(async (req, res) => {
    const ol = await jangniOl(req, res);
    if (!ol) return;
    const q = qasoslar.get(ol.j.id);
    if (q && q.soruvchi === ol.tomon && !q.jangId) qasoslar.delete(ol.j.id);
    res.json({ ok: true });
  })
);

/** Do'stni chaqirish: taklif kodi yaratish (faol kod bo'lsa — o'sha) */
oktagonRouter.post(
  '/taklif',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    takliflarniTozala();
    const t = Date.now();
    const eski = egasiKodi.get(men);
    const x = eski ? takliflar.get(eski) : undefined;
    if (eski && x && !x.jangId) {
      x.oxirgi = t;
      return res.json({ kod: eski, qolganMs: TAKLIF_MUDDATI_MS - (t - x.yaratildi) });
    }
    const kod = yangiKod();
    takliflar.set(kod, { egasi: men, yaratildi: t, oxirgi: t });
    egasiKodi.set(men, kod);
    res.json({ kod, qolganMs: TAKLIF_MUDDATI_MS });
  })
);

/** Taklif holati: do'st qo'shilsa — jangId */
oktagonRouter.get(
  '/taklif',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    takliflarniTozala();
    const kod = egasiKodi.get(men);
    const x = kod ? takliflar.get(kod) : undefined;
    if (!kod || !x) return res.json({ holat: 'yoq' });
    x.oxirgi = Date.now();
    if (x.jangId && x.jangId > 0) {
      takliflar.delete(kod);
      egasiKodi.delete(men);
      return res.json({ holat: 'topildi', jangId: x.jangId });
    }
    res.json({ holat: 'kutmoqda', kod, qolganMs: Math.max(0, TAKLIF_MUDDATI_MS - (Date.now() - x.yaratildi)) });
  })
);

oktagonRouter.delete(
  '/taklif',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const kod = egasiKodi.get(men);
    const x = kod ? takliflar.get(kod) : undefined;
    // Shu soniyada do'st qo'shilgan bo'lsa — jangId qaytadi (do'st kutib qolmasin)
    if (kod && x?.jangId && x.jangId > 0) {
      takliflar.delete(kod);
      egasiKodi.delete(men);
      return res.json({ ok: true, jangId: x.jangId });
    }
    if (kod && x && !x.jangId) {
      takliflar.delete(kod);
      egasiKodi.delete(men);
    }
    res.json({ ok: true, jangId: null });
  })
);

/** Do'stning kodi bilan qo'shilish: { kod } → { jangId } */
oktagonRouter.post(
  '/taklif/qoshil',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    takliflarniTozala();
    const kod = String(req.body?.kod || '').replace(/\D/g, '');
    const x = takliflar.get(kod);
    if (!x) return res.status(404).json({ error: 'Kod topilmadi yoki eskirgan' });
    if (x.egasi === men) return res.status(400).json({ error: 'Bu sizning kodingiz — uni do‘stingizga yuboring' });
    if (x.jangId) return res.status(409).json({ error: 'Bu taklif bilan allaqachon jang boshlangan' });
    if (Date.now() - x.oxirgi > 8000) return res.status(410).json({ error: 'Do‘stingiz kutishni to‘xtatgan' });
    x.jangId = -1; // band
    try {
      const jang = await jangYarat(x.egasi, men);
      x.jangId = jang.id;
      res.json({ jangId: jang.id });
    } catch (e) {
      x.jangId = undefined;
      throw e;
    }
  })
);

/** Eng zo'rlari — ball bo'yicha 50 ta + o'zimning o'rnim */
oktagonRouter.get(
  '/reyting',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const top = await prisma.user.findMany({
      where: { oktagonJang: { gt: 0 } },
      orderBy: [{ oktagonBall: 'desc' }, { oktagonJang: 'asc' }, { id: 'asc' }],
      take: 50,
      select: { id: true, firstName: true, oktagonBall: true, oktagonJang: true },
    });
    const meniki = await prisma.user.findUnique({ where: { id: men }, select: { oktagonBall: true, oktagonJang: true } });
    const orin = meniki?.oktagonJang
      ? (await prisma.user.count({ where: { oktagonJang: { gt: 0 }, oktagonBall: { gt: meniki.oktagonBall } } })) + 1
      : null;
    res.json({
      list: top.map((u, n) => ({
        orin: n + 1,
        ism: u.firstName,
        ball: u.oktagonBall,
        daraja: daraja(u.oktagonBall),
        janglar: u.oktagonJang,
        men: u.id === men,
      })),
      orin,
    });
  })
);

/** Mening janglarim — oxirgi 30 ta tugagan jang */
oktagonRouter.get(
  '/janglarim',
  ah(async (req, res) => {
    const men = (req as any).userId as number;
    const janglar = await prisma.oktagonJang.findMany({
      where: { holat: 'tugadi', OR: [{ p1Id: men }, { p2Id: men }] },
      orderBy: { id: 'desc' },
      take: 30,
    });
    const raqibIdlar = janglar.map((j) => (j.p1Id === men ? j.p2Id : j.p1Id)).filter((x): x is number => x != null);
    const ismlar = await prisma.user.findMany({ where: { id: { in: raqibIdlar } }, select: { id: true, firstName: true } });
    res.json({
      list: janglar.map((j) => {
        const p1 = j.p1Id === men;
        const a = javoblar(j.p1Javob);
        const b = j.p2Id == null ? botJavoblari(j, true) : javoblar(j.p2Javob);
        const menT = (p1 ? a : b).filter((x) => x.togri).length;
        const raqibT = (p1 ? b : a).filter((x) => x.togri).length;
        const raqibId = p1 ? j.p2Id : j.p1Id;
        const chiqdi = p1 ? j.p1Chiqdi : j.p2Chiqdi;
        return {
          id: j.id,
          sana: j.tugadi || j.boshlandi,
          raqib: raqibId == null ? j.botIsm || 'Bot' : ismlar.find((u) => u.id === raqibId)?.firstName || 'O‘chirilgan',
          bot: raqibId == null,
          menT,
          raqibT,
          ozgarish: (p1 ? j.p1Ozgarish : j.p2Ozgarish) ?? 0,
          natija: chiqdi ? 'chiqdi' : menT > raqibT ? 'galaba' : menT === raqibT ? 'durang' : 'maglubiyat',
        };
      }),
    });
  })
);
