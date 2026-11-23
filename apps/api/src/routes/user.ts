import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { raqamliSavolIdlari } from '../raqamli';
import { BALL, ballQosh, faollik, shablonTekshir } from '../ball';
import { kalitDarajasi, IMKONIYAT_DARAJA, tarifDarajasi, mediaKalit } from '../tarif';
import { BOT_TOKEN, DEV_AUTH } from '../env';
import { verifyTelegramInitData, signUserToken, requireUser, optionalUserId } from '../auth';
import { shifrla } from '../passwordVault';
import { telegramgaYubor, esc } from '../notify';
import { lessonFilePath, mobilFilePath, posterFilePath, TOIFALAR, savolVideoYoli } from '../uploads';
import { mobilNusxaBormi, muqovaYasa } from '../video';
import { xatoUlushlari, xatoStatistikasi, qiyinSavolIdlari } from '../qiyinlik';
import { keshla } from '../kesh';
import { BELGI_TANLOV, belgiJson, belgiTartibi } from '../belgilar';
import { AKSIYA_TANLOV, AKSIYA_TARTIBI, aksiyaJson } from '../aksiyalar';

// Telefon raqamni +998XXXXXXXXX ko'rinishiga keltiradi
function normPhone(raw: any): string | null {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 9) d = '998' + d; // 90XXXXXXX -> 99890XXXXXXX
  if (d.startsWith('998') && d.length === 12) return '+' + d;
  return null;
}

// Pochtani kichik harfga keltirib tekshiradi. Qat'iy RFC emas — amaliy tekshiruv:
// bo'sh joysiz, bitta @, nuqtali domen.
function normEmail(raw: any): string | null {
  const e = String(raw || '').trim().toLowerCase();
  if (!e) return null;
  if (e.length > 120) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

export const userRouter = Router();

/**
 * Foydalanuvchi obyektini brauzerga yuborishdan oldin tozalaydi.
 * XAVFSIZLIK: avval /auth/login, /auth/register, /auth/telegram va /me javoblari
 * butun User yozuvini, ya'ni passwordHash ni ham qaytarardi — parol hashi
 * brauzerga chiqib ketardi. Endi u hech qachon javobga tushmaydi.
 */
function safeUser<T extends { passwordHash?: string | null; passwordEnc?: string | null }>(u: T) {
  if (!u) return u;
  // passwordEnc ham chiqmasin — u faqat admin panelida, alohida endpointda ochiladi
  const { passwordHash: _h, passwordEnc: _e, ...rest } = u;
  // Parolning O'ZI emas, faqat bor-yo'qligi: akkauntni o'chirishda ilova
  // parol so'rash kerakmi-yo'qmi shuni biladi (Telegram orqali kirganda parol yo'q).
  return { ...rest, hasPassword: !!_h };
}

const ah =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const questionInclude = {
  options: { orderBy: { order: 'asc' as const } },
  topic: true,
  ticket: true,
  category: true,
};

/**
 * Nashr qilingan barcha savollar (variant, mavzu, bilet, toifa bilan) — test so'rovlarining asosi.
 * Har so'rovda bazadan qayta yuklanardi (1260 savol, ~5000 variant); endi xotirada, 5 daqiqa.
 * Admin biror narsani o'zgartirsa darhol tozalanadi (admin.ts). Qaytgan obyektlarni O'ZGARTIRMANG.
 */
export const nashrSavollari = keshla(5 * 60_000, () =>
  prisma.question.findMany({ where: { status: 'published' }, include: questionInclude, orderBy: { id: 'asc' } }),
);

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Auth ---------- */
userRouter.post(
  '/auth/telegram',
  ah(async (req, res) => {
    let tgId: string | null = null;
    let firstName = 'Foydalanuvchi';
    let avatarUrl: string | null = null;

    const initData: string = req.body?.initData || '';

    // 1) initData bo'lsa — Telegram imzosini tekshiramiz (haqiqiy foydalanuvchi)
    if (initData && BOT_TOKEN) {
      const { ok, user } = verifyTelegramInitData(initData, BOT_TOKEN);
      if (ok && user) {
        tgId = String(user.id);
        firstName = user.first_name || 'Foydalanuvchi';
        avatarUrl = user.photo_url || null;
      } else if (!DEV_AUTH) {
        return res.status(401).json({ error: 'Telegram imzosi yaroqsiz' });
      }
    }

    // 2) Mehmon (qurilma bo'yicha) hisobi YO'Q — dasturga faqat ro'yxatdan o'tib kiriladi (2026-11-11).
    //    Faqat lokal ishlab chiqishda (DEV_AUTH) umumiy demo foydalanuvchi.
    if (!tgId) {
      if (!DEV_AUTH) return res.status(401).json({ error: 'Kirish uchun ro‘yxatdan o‘ting' });
      const demo = await prisma.user.upsert({
        where: { tgId: 'dev-user' },
        update: {},
        create: { tgId: 'dev-user', firstName: 'Demo foydalanuvchi' },
      });
      return res.json({ token: signUserToken(demo.id), user: safeUser(demo) });
    }

    // Telegram orqali — faqat shu Telegram bilan bog'langan MAVJUD hisobga kiriladi, yangi hisob ochilmaydi
    const bor = await prisma.user.findUnique({ where: { tgId } });
    if (!bor) return res.status(401).json({ error: 'Kirish uchun ro‘yxatdan o‘ting' });
    const user = await prisma.user.update({ where: { id: bor.id }, data: { firstName, avatarUrl } });
    res.json({ token: signUserToken(user.id), user: safeUser(user) });
  })
);

// Telefon + parol bilan ro'yxatdan o'tish
userRouter.post(
  '/auth/register',
  ah(async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 60) || 'Foydalanuvchi';
    const password = String(req.body?.password || '');

    // Telefon YOKI pochta — kamida bittasi bo'lishi shart, ikkalasi ham bo'lsa bo'ladi
    const phoneRaw = String(req.body?.phone || '').trim();
    const emailRaw = String(req.body?.email || '').trim();
    if (!phoneRaw && !emailRaw) {
      return res.status(400).json({ error: 'Telefon raqami yoki pochta manzilini kiriting' });
    }

    const phone = phoneRaw ? normPhone(phoneRaw) : null;
    if (phoneRaw && !phone) {
      return res.status(400).json({ error: 'Telefon raqami noto‘g‘ri. +998 bilan 9 raqam kiriting' });
    }
    const email = emailRaw ? normEmail(emailRaw) : null;
    if (emailRaw && !email) {
      return res.status(400).json({ error: 'Pochta manzili noto‘g‘ri. Namuna: ism@example.com' });
    }

    if (password.length < 4) return res.status(400).json({ error: 'Parol kamida 4 ta belgidan iborat bo‘lsin' });

    if (phone && (await prisma.user.findUnique({ where: { phone } }))) {
      return res.status(409).json({ error: 'Bu raqam allaqachon ro‘yxatdan o‘tgan. Kiring.' });
    }
    if (email && (await prisma.user.findUnique({ where: { email } }))) {
      return res.status(409).json({ error: 'Bu pochta allaqachon ro‘yxatdan o‘tgan. Kiring.' });
    }

    // Ixtiyoriy promokod (ilova): do'stining kodi bilan kelgan — Autostart maktabida chegirma oladi.
    // Parametr berilmasa — avvalgidek.
    const promo = String(req.body?.promo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const egasi = promo ? await prisma.user.findUnique({ where: { promoKod: promo }, select: { id: true } }) : null;
    if (promo && !egasi) {
      return res.status(400).json({ error: 'Promokod topilmadi. Tekshirib qayta kiriting yoki bo‘sh qoldiring' });
    }

    const user = await prisma.user.create({
      data: {
        phone, email, firstName: name,
        passwordHash: bcrypt.hashSync(password, 10),
        passwordEnc: shifrla(password), // admin panelida ko'rsatish uchun
        taklifQiluvchiId: egasi?.id ?? null,
      },
    });
    if (egasi) await prisma.promoTaklif.create({ data: { egasiId: egasi.id, dostId: user.id, kod: promo } });
    res.json({ token: signUserToken(user.id), user: safeUser(user) });
  })
);

/**
 * Sessiyani uzaytirish — mobil ilova har ochilganda chaqiradi va yangi token
 * oladi. Ilovadan muntazam foydalanilsa, qayta login so'ralmaydi. Token
 * yaroqsiz bo'lsa requireUser 401 qaytaradi (bu holda ilova login so'raydi).
 */
userRouter.post(
  '/auth/refresh',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const bor = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!bor) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    res.json({ token: signUserToken(userId) });
  })
);

// Telefon + parol bilan kirish
userRouter.post(
  '/auth/login',
  ah(async (req, res) => {
    const password = String(req.body?.password || '');
    // `login` — telefon yoki pochta. Eski mijozlar `phone` yuboradi, u ham ishlaydi.
    const raw = String(req.body?.login ?? req.body?.phone ?? '').trim();
    if (!raw) return res.status(400).json({ error: 'Telefon yoki pochta manzilini kiriting' });

    let user = null;
    if (raw.includes('@')) {
      const email = normEmail(raw);
      if (!email) return res.status(400).json({ error: 'Pochta manzili noto‘g‘ri' });
      user = await prisma.user.findUnique({ where: { email } });
    } else {
      const phone = normPhone(raw);
      if (!phone) return res.status(400).json({ error: 'Telefon raqami noto‘g‘ri' });
      user = await prisma.user.findUnique({ where: { phone } });
    }

    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash))
      return res.status(401).json({ error: 'Login yoki parol xato' });
    res.json({ token: signUserToken(user.id), user: safeUser(user) });
  })
);

/* ---------- Ovozli o'qish (Microsoft Edge neural TTS, o'zbek ovozi) ---------- */
userRouter.get(
  '/tts',
  ah(async (req, res) => {
    const text = String(req.query.text || '').trim().slice(0, 1200);
    if (!text) return res.status(400).json({ error: 'Matn yoʻq' });
    const voice = String(req.query.voice || '') === 'male' ? 'uz-UZ-SardorNeural' : 'uz-UZ-MadinaNeural';
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const result: any = tts.toStream(text);
      const stream = result.audioStream || result;
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
        stream.on('end', () => resolve());
        stream.on('close', () => resolve());
        stream.on('error', reject);
      });
      const audio = Buffer.concat(chunks);
      if (!audio.length) return res.status(502).json({ error: 'Audio boʻsh' });
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(audio);
    } catch (e: any) {
      res.status(502).json({ error: 'TTS xatosi: ' + (e?.message || e) });
    }
  })
);

/* ---------- Savol ovozi (admin yuklagan — Tushuncha uchun, public) ---------- */
userRouter.get(
  '/questions/:id/audio',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const [a, q] = await Promise.all([
      prisma.questionAudio.findUnique({ where: { questionId: id } }),
      prisma.question.findUnique({ where: { id }, select: { shablon: true } }),
    ]);
    if (!a) return res.status(404).json({ error: 'Ovoz yoʻq' });
    // Audio sharh — Standart tarifdan (1-bilet namunasi hammaga ochiq)
    if (q?.shablon !== 1 && kalitDarajasi(req.query.k) < IMKONIYAT_DARAJA.audio)
      return res.status(403).json({ error: 'Audio sharh Standart tarifida', tarif: 'standart' });
    res.setHeader('Content-Type', a.mime || 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(Buffer.from(a.data));
  })
);

/* ---------- Savol video tushunchasi (public, Range bilan) ---------- */
userRouter.get(
  '/questions/:id/video',
  ah(async (req, res) => {
    const q = await prisma.question.findUnique({ where: { id: Number(req.params.id) }, select: { videoFile: true, shablon: true } });
    if (!q?.videoFile) return res.status(404).json({ error: 'Video yoʻq' });
    // Video dars — Silver tarifdan (1-bilet namunasi hammaga ochiq)
    if (q.shablon !== 1 && kalitDarajasi(req.query.k) < IMKONIYAT_DARAJA.video)
      return res.status(403).json({ error: 'Video darslar Silver tarifida', tarif: 'silver' });
    const fayl = savolVideoYoli(q.videoFile);
    if (!fs.existsSync(fayl)) return res.status(404).json({ error: 'Video fayli topilmadi' });
    res.sendFile(fayl, { acceptRanges: true, headers: { 'Cache-Control': 'private, max-age=604800' } }, (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: 'Videoni o‘qib bo‘lmadi' });
    });
  })
);

/* ---------- Savol rasmi (admin yuklagan — test oynasida, public) ---------- */
userRouter.get(
  '/questions/:id/image',
  ah(async (req, res) => {
    const img = await prisma.questionImage.findUnique({ where: { questionId: Number(req.params.id) } });
    if (!img) return res.status(404).json({ error: 'Rasm yoʻq' });
    res.setHeader('Content-Type', img.mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');  // rasm o'zgarsa darhol ko'rinsin (ETag baribir tejaydi)
    res.send(Buffer.from(img.data));
  })
);

/* ---------- Tarjima (butun ilova UI uchun — public, o'zbekcha lotin -> rus/...) ---------- */
userRouter.get(
  '/translate',
  ah(async (req, res) => {
    const text = String(req.query.text || '').trim().slice(0, 900);
    const to = String(req.query.to || 'ru');
    if (!text) return res.json({ text: '' });
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=uz&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(502).json({ error: 'Tarjima xizmati javob bermadi', text: '' });
      const data: any = await r.json();
      const translated = Array.isArray(data?.[0]) ? data[0].map((seg: any) => (seg && seg[0]) || '').join('') : '';
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.json({ text: translated });
    } catch (e: any) {
      res.status(502).json({ error: 'Tarjima xatosi', text: '' });
    }
  })
);

/* ---------- Profil ---------- */
userRouter.get(
  '/me',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // Hisob o'chirilgan (masalan mehmonlar tozalangan) — eski token bilan kirib qolmasin: kirish oynasiga
    if (!user) return res.status(401).json({ error: 'Hisob topilmadi. Qaytadan kiring yoki ro‘yxatdan o‘ting.' });
    // Sayt va ilova statistikasi BIR XIL — barcha javoblar (2026-11-11). Eski ilovalar yuborgan ?manba=ilova e'tiborsiz.
    const jw: any = { userId };
    // So'rovlar bir vaqtda (avval ketma-ket 7 ta edi). Har savolning OXIRGI javobi: yechilgan
    // savollar soni va menyudagi nishon ("Xato qilgan savollarim" sahifasidagi son bilan bir xil —
    // oxirgi javobi xato bo'lganlar). (stats.wrong esa umuman xato javoblar soni — qayta urinishlar bilan.)
    // Ketma-ketlik (streak): har kuni kamida bitta javob berilgan kunlar — oxirgi 2000 javobdan.
    const [total, correct, oxirgiJavob, bookmarks, totalQuestions, kunlar] = await Promise.all([
      prisma.userAnswer.count({ where: jw }),
      prisma.userAnswer.count({ where: { ...jw, isCorrect: true } }),
      oxirgiJavoblar(userId),
      prisma.bookmark.count({ where: { userId } }),
      nashrSavollari().then((s) => s.length), // nashr qilingan savollar soni — keshdan
      prisma.userAnswer.findMany({
        where: jw,
        select: { answeredAt: true },
        orderBy: { answeredAt: 'desc' },
        take: 2000,
      }),
    ]);
    const solvedQuestions = oxirgiJavob;
    const mistakes = oxirgiJavob.filter((a) => !a.isCorrect).length;
    const kunSet = new Set(kunlar.map((k) => kunKaliti(k.answeredAt)));
    // O'tkazib yuborilgan kunlar: oxirgi faol kundan bugungacha (bugun hali javob bo'lmasa)
    let otkazilgan = 0;
    if (kunlar.length && !kunSet.has(kunKaliti(new Date()))) {
      const oxirgiKun = new Date(kunKaliti(kunlar[0].answeredAt) + 'T00:00:00');
      const bugun = new Date(kunKaliti(new Date()) + 'T00:00:00');
      otkazilgan = Math.max(0, Math.round((bugun.getTime() - oxirgiKun.getTime()) / 86400_000) - 1);
    }
    const tarifH = await tarifDarajasi(userId);
    let streak = 0;
    const d = new Date();
    // Bugun hali yechmagan bo'lsa, ketma-ketlik kechadan boshlanadi
    if (!kunSet.has(kunKaliti(d))) d.setDate(d.getDate() - 1);
    while (kunSet.has(kunKaliti(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    res.json({
      user: user ? safeUser(user) : user,
      stats: {
        answered: total,
        correct,
        wrong: total - correct,
        mistakes,
        streak,
        solvedQuestions: solvedQuestions.length,
        bookmarks,
        totalQuestions,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
      },
      otkazilgan,
      tarif: {
        daraja: tarifH.daraja,
        joriy: tarifH.joriy ? { kod: tarifH.joriy.kod, nom: tarifH.joriy.nom, tugaydi: tarifH.joriy.tugaydi } : null,
        kalit: mediaKalit(userId, tarifH.daraja),
      },
    });
  })
);

userRouter.patch(
  '/me',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    // XAVFSIZLIK: faqat shu uchta maydon qabul qilinadi. `role` bu yerga
    // HECH QACHON qo'shilmasin — aks holda istalgan foydalanuvchi o'zini
    // admin qilib olardi. Role faqat /admin/users/:id/role orqali o'zgaradi.
    const { alphabet, category, lang, examDate, viloyat, tuman } = req.body || {};
    // Imtihon sanasi: "YYYY-MM-DD" yoki null (o'chirish)
    let sana: Date | null | undefined;
    if (examDate === null || examDate === '') sana = null;
    else if (typeof examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(examDate)) sana = new Date(examDate + 'T09:00:00+05:00');
    const qisqa = (x: unknown) => (typeof x === 'string' ? x.trim().slice(0, 80) || null : x === null ? null : undefined);
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(alphabet ? { alphabet } : {}),
        ...(typeof category === 'string' && /^[A-Z0-9]{1,4}$/.test(category) ? { category } : {}),
        ...(lang ? { lang } : {}),
        ...(sana !== undefined ? { examDate: sana } : {}),
        ...(qisqa(viloyat) !== undefined ? { viloyat: qisqa(viloyat) } : {}),
        ...(qisqa(tuman) !== undefined ? { tuman: qisqa(tuman) } : {}),
      },
    });
    res.json({ user: safeUser(user) });
  })
);

/**
 * Akkauntni butunlay o'chirish.
 *
 * App Store va Play Market talabi: ilovada ro'yxatdan o'tish bor ekan,
 * foydalanuvchi akkauntini ilovaning O'ZIDA o'chira olishi shart. Aks holda
 * ilova do'konga qo'yilmaydi.
 *
 * Javoblar, saqlangan savollar va shikoyatlar sxemada onDelete: Cascade —
 * ularni baza o'zi o'chiradi. Xabarlar esa alohida o'chiriladi: ularda ism va
 * telefon raqami bor, ya'ni shaxsiy ma'lumot.
 */
userRouter.delete(
  '/me',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    // Owner o'chib ketsa tizimni boshqaradigan odam qolmaydi.
    if (user.role === 'owner') {
      return res.status(403).json({ error: "Owner hisobini o'chirib bo'lmaydi. Avval boshqa hisobga owner rolini bering." });
    }

    // Parol bilan kirganlardan tasdiq so'raymiz — telefon boshqa qo'lga tushsa
    // ham akkaunt bir bosishda o'chib ketmasin. Telegram orqali kirganlarda
    // parol yo'q, ularda tasdiq ilova tomonida so'raladi.
    if (user.passwordHash) {
      const password = String(req.body?.password || '');
      if (!password) return res.status(400).json({ error: 'Tasdiqlash uchun parolingizni kiriting' });
      if (!bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: "Parol noto'g'ri" });
      }
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ ok: true });
  })
);

/* ---------- Katalog ---------- */
userRouter.get(
  '/categories',
  ah(async (_req, res) => res.json(await prisma.category.findMany({ orderBy: { id: 'asc' } })))
);

userRouter.get(
  '/topics',
  ah(async (_req, res) => {
    const topics = await prisma.topic.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { questions: true } } },
    });
    res.json(topics.map((t) => ({ id: t.id, name: t.name, count: t._count.questions })));
  })
);

userRouter.get(
  '/tickets',
  ah(async (_req, res) => {
    const tickets = await prisma.ticket.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { questions: true } } },
    });
    res.json(tickets.map((t) => ({ id: t.id, name: t.name, count: t._count.questions })));
  })
);

/* ---------- Savollar ---------- */
userRouter.get(
  '/questions',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const mode = String(req.query.mode || 'all');
    const topicId = req.query.topicId ? Number(req.query.topicId) : undefined;
    const ticketId = req.query.ticketId ? Number(req.query.ticketId) : undefined;
    const shablon = req.query.shablon ? Number(req.query.shablon) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    // `ids=1,2,3` — aniq savollar, berilgan tartibda (ilovadagi "Test yechish"
    // tugallanmagan testni qayta ochadi). Bir so'rovda eng ko'pi 120 ta.
    // Parametr berilmasa hech narsa o'zgarmaydi.
    if (req.query.ids) {
      const idlar = String(req.query.ids)
        .split(',')
        .map((x) => Math.floor(Number(x)))
        .filter((x) => x > 0)
        .slice(0, 120);
      const topilgan = await prisma.question.findMany({
        where: { status: 'published', id: { in: idlar } },
        include: questionInclude,
      });
      const tartib = new Map(idlar.map((id, i) => [id, i]));
      topilgan.sort((a, b) => (tartib.get(a.id) ?? 0) - (tartib.get(b.id) ?? 0));
      return res.json(topilgan);
    }

    const base: any = { status: 'published' };
    if (topicId) base.topicId = topicId;
    if (ticketId) base.ticketId = ticketId;
    if (shablon) base.shablon = shablon;
    // Raqamli savollar: `avto=1` (ilova) — javob variantlaridan avtomatik
    // aniqlanadi ("50 km/s", "16 yosh"). Parametrsiz — avvalgidek, faqat belgi.
    if (mode === 'numeric') {
      if (req.query.avto === '1') base.id = { in: await raqamliSavolIdlari() };
      else base.isNumeric = true;
    }

    // Saqlangan savollar
    if (mode === 'saved') {
      const bms = await prisma.bookmark.findMany({
        where: { userId },
        include: { question: { include: questionInclude } },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(bms.map((b) => b.question));
    }

    // Xatolar (oxirgi javob noto'g'ri bo'lganlar)
    if (mode === 'mistakes') {
      return res.json(await getMistakes(userId));
    }

    // Mashq: xato qilgan YOKI hali to'g'ri yechilmagan savollar (Test yechish tugmasi)
    if (mode === 'practice') {
      return res.json(await getPractice(userId));
    }

    // Qiyin savollar — BARCHA talabalar eng ko'p xato qiladiganlari.
    // Avval bu rejim `isTricky` qo'l belgisi bo'yicha filtrlardi; o'sha belgi
    // hech bir savolga qo'yilmagani uchun oyna doim bo'sh ochilardi.
    // Endi haqiqiy javoblardan hisoblanadi (Tahlil sahifasi bilan bir xil ta'rif).
    if (mode === 'tricky') {
      const n = Math.min(limit || 40, 120);
      const jam = await xatoUlushlari(); // baza hisoblaydi, 10 daqiqa keshlanadi
      // Odatda kamida 2 talaba javob bergan savollar olinadi (bitta odamning
      // bitta xatosi hali "qiyin" degani emas). Ammo ma'lumot hali kam bo'lsa
      // shart bo'shashadi — oyna bo'sh ochilib qolmasligi kerak.
      let statIdlar = qiyinSavolIdlari(jam, { minJavob: 2, limit: n });
      if (!statIdlar.length) statIdlar = qiyinSavolIdlari(jam, { minJavob: 1, limit: n });
      // Admin qo'lda "qiyin" deb belgilaganlari ham qoladi — belgi kuchini yo'qotmasin
      const qolda = (
        await prisma.question.findMany({ where: { ...base, isTricky: true }, select: { id: true } })
      ).map((q) => q.id);

      const idlar = [...new Set([...qolda, ...statIdlar])].slice(0, n);
      if (!idlar.length) return res.json([]);

      const topilgan = await prisma.question.findMany({
        where: { ...base, id: { in: idlar } },
        include: questionInclude,
      });
      // Bazadan kelgan tartib emas — eng ko'p xato qilinadigani birinchi tursin
      const oriniga = new Map(idlar.map((id, i) => [id, i]));
      topilgan.sort((a, b) => (oriniga.get(a.id) ?? 0) - (oriniga.get(b.id) ?? 0));

      // Statistikani savolga biriktiramiz — test oynasida "talabalarning N% i
      // shu savolda xato qilgan" deb ko'rsatiladi. Busiz oyna oddiy testdan
      // farq qilmasdi va o'zgarish umuman sezilmasdi.
      return res.json(
        topilgan.map((q) => {
          const g = jam.get(q.id);
          if (!g) return q;
          return { ...q, xatoUlushi: Math.round((g.wrong / g.total) * 100), xatoSoni: g.wrong, jamiJavob: g.total };
        })
      );
    }

    // `tartib=shablon` (ilovadagi "Barcha testlar"): avval 1-shablon savollari,
    // keyin 2-shablon va h.k.; shablon ichida admin belgilagan tartib.
    // Shablonga biriktirilmagan savollar oxirida. Parametr berilmasa tartib
    // avvalgidek — sayt o'zgarmaydi.
    const shablonTartibi = mode === 'all' && req.query.tartib === 'shablon';
    // Filtr va tartib xotirada — avvalgi baza so'rovi (where: base, orderBy) bilan aynan bir xil
    const raqamliId: Set<number> | null = base.id?.in ? new Set(base.id.in as number[]) : null;
    let questions = (await nashrSavollari())
      .filter((q) =>
        (!topicId || q.topicId === topicId) &&
        (!ticketId || q.ticketId === ticketId) &&
        (!shablon || q.shablon === shablon) &&
        (!raqamliId || raqamliId.has(q.id)) &&
        (base.isNumeric !== true || q.isNumeric === true))
      .sort((a, b) =>
        (shablonTartibi
          ? (a.shablon == null ? 1 : 0) - (b.shablon == null ? 1 : 0) || (a.shablon ?? 0) - (b.shablon ?? 0)
          : 0) ||
        a.order - b.order ||
        a.id - b.id);

    // XAVFSIZLIK (ko'chirishga qarshi): bitta so'rovda butun savol banki
    // qaytarilmaydi. Avval mode=all HAMMA 1238 savolni javoblari bilan berardi —
    // obunachi ham bir so'rovda hammasini ko'chirib olardi. Endi qat'iy cheklov:
    // eng ko'pi MAX ta (test uchun yetarli: shablon=20, imtihon=20/50/100).
    const MAX = 120;
    // Random test 500 tagacha so'raydi (saytda 20/50/100/200, ilovada 50/100/200/500) —
    // shu rejimga alohida yuqori shift. Asosiy himoya — /api/questions uchun so'rovlar
    // soni cheklovi; bitta testning hajmi bankni yig'ib olishni sezilarli tezlashtirmaydi.
    const RANDOM_MAX = 500;
    if (shablon) {
      // Shablon test: bitta bilet (20 ta), tartib bo'yicha — cheklov ichida
      questions = questions.slice(0, MAX);
    } else if (mode === 'exam' || mode === 'random' || mode === '50' || mode === '100') {
      const cap = mode === 'random' ? RANDOM_MAX : MAX;
      const n = Math.min(limit || (mode === '100' ? 100 : mode === '50' ? 50 : 20), cap);
      questions = shuffle(questions).slice(0, n);
    } else {
      // mode=all / mavzu / bilet mashqi — baribir cheklanadi (butun bank emas).
      // Ilovadagi "Barcha testlar" butun bankni ko'rsatadi: MAX tadan bo'lib,
      // `offset` bilan ketma-ket so'raydi. Har bir so'rov cheklovda qoladi,
      // /api/questions uchun umumiy tezlik chegarasi ham amal qiladi.
      const offset = mode === 'all' ? Math.max(0, Math.floor(Number(req.query.offset) || 0)) : 0;
      const n = Math.min(limit || MAX, MAX);
      questions = questions.slice(offset, offset + n);
    }

    res.json(questions);
  })
);

/* ---------- Javob berish ---------- */
userRouter.post(
  '/answers',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const questionId = Number(req.body?.questionId);
    const chosen: number[] = Array.isArray(req.body?.chosen) ? req.body.chosen.map(Number) : [];
    const timeMs = Number(req.body?.timeMs || 0);
    // Mobil ilovadan kelgan javob belgilanadi (faqat tahlil uchun — ko'rsatishda sayt va ilova bir xil)
    const source = req.body?.manba === 'ilova' ? 'ilova' : null;

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
    if (!question) return res.status(404).json({ error: 'Savol topilmadi' });

    const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
    const isCorrect = sameSet(chosen, correctIds);

    await prisma.userAnswer.create({
      data: { userId, questionId, isCorrect, chosen: JSON.stringify(chosen), timeMs, source },
    });

    // Daraja tizimi: savolga birinchi to'g'ri javob +1 coin (qayta yechsa — berilmaydi).
    // Haqiqiy imtihonda coin berilmaydi (o'quvchini chalg'itmaslik uchun) — ilova `imtihon: true` yuboradi.
    const imtihon = req.body?.imtihon === true;
    let coin = 0;
    if (isCorrect && !imtihon) {
      try { if (await ballQosh(userId, 'javob', BALL.javob, `javob:${questionId}`)) coin = BALL.javob; } catch (e: any) { console.error('[ball]', e?.message || e); }
    }
    // Kunning birinchi javobi +5, shablon yiqilmasdan tugasa +20 — fonda
    void (async () => {
      await faollik(userId);
      if (question.shablon && !imtihon) await shablonTekshir(userId, question.shablon);
    })().catch((e) => console.error('[ball]', e?.message || e));

    res.json({ isCorrect, correctOptionIds: correctIds, coin });
  })
);

// To'g'ri yechilmagan (xato yoki umuman javob berilmagan) savollar
async function getPractice(userId: number) {
  const all = await nashrSavollari();
  const latest = new Map((await oxirgiJavoblar(userId)).map((a) => [a.questionId, a.isCorrect]));
  return all.filter((q) => latest.get(q.id) !== true);
}

/**
 * Foydalanuvchining har savolga OXIRGI javobi — baza tanlaydi (DISTINCT ON, indeks
 * [userId, questionId, answeredAt]). Avval barcha javoblari (faol talabada 40 mingdan ortiq)
 * xotiraga yuklanib, JS da saralanardi — ko'p kishi kirganda server qotardi.
 * Natija: savol id bo'yicha tartiblangan, ko'pi bilan savollar soncha qator.
 */
async function oxirgiJavoblar(userId: number) {
  return prisma.$queryRaw<{ questionId: number; isCorrect: boolean; chosen: string; answeredAt: Date }[]>`
    SELECT DISTINCT ON ("questionId") "questionId", "isCorrect", chosen, "answeredAt"
    FROM "UserAnswer"
    WHERE "userId" = ${userId}
    ORDER BY "questionId", "answeredAt" DESC, id DESC`;
}

/** Xatolar — sayt va ilovada bir xil (barcha javoblar bo'yicha) */
async function getMistakes(userId: number) {
  const latest = new Map((await oxirgiJavoblar(userId)).map((a) => [a.questionId, { ok: a.isCorrect, chosen: a.chosen }]));
  const wrong = [...latest.entries()].filter(([, v]) => !v.ok);
  if (!wrong.length) return [];
  const wrongIds = wrong.map(([qid]) => qid);
  const questions = await prisma.question.findMany({
    where: { id: { in: wrongIds } },
    include: questionInclude,
  });
  const chosenMap = new Map(wrong.map(([qid, v]) => [qid, v.chosen]));
  // Har savolga foydalanuvchi tanlagan (xato) variantlarni biriktiramiz
  return questions.map((q) => {
    let myChosen: number[] = [];
    try {
      myChosen = JSON.parse(chosenMap.get(q.id) || '[]');
    } catch {
      myChosen = [];
    }
    return { ...q, myChosen };
  });
}

/** Sanani YYYY-MM-DD ga aylantiradi (server vaqti bo'yicha, UTC emas) */
function kunKaliti(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const kun = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${kun}`;
}

/* ---------- Yechilgan savollar ---------- */
/** Foydalanuvchi javob bergan savollar (har biriga OXIRGI javobi bilan) */
userRouter.get(
  '/solved',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const oxirgi = new Map(
      (await oxirgiJavoblar(userId)).map((a) => [a.questionId, { ok: a.isCorrect, chosen: a.chosen, at: a.answeredAt }]),
    );
    if (!oxirgi.size) return res.json([]);

    const questions = await prisma.question.findMany({
      where: { id: { in: [...oxirgi.keys()] } },
      include: questionInclude,
    });
    // Oxirgi javob vaqti bo'yicha yangisidan eskisiga
    return res.json(
      questions
        .map((q) => {
          const o = oxirgi.get(q.id)!;
          let myChosen: number[] = [];
          try { myChosen = JSON.parse(o.chosen || '[]'); } catch { myChosen = []; }
          return { ...q, myChosen, myCorrect: o.ok, answeredAt: o.at };
        })
        .sort((a, b) => +new Date(b.answeredAt) - +new Date(a.answeredAt))
    );
  })
);

/* ---------- Kunlik statistika (7/30 kunlik grafik uchun) ---------- */
userRouter.get(
  '/stats/daily',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const days = Math.min(Math.max(Number(req.query.days) || 7, 2), 60);

    // MUHIM: oraliq ham, javoblar ham BIR XIL usulda sanaga aylantiriladi.
    // Avval oraliq mahalliy vaqtda, javoblar esa UTC bo'yicha guruhlangandi —
    // shu sababli bugungi kun ro'yxatga tushmay qolardi.
    const boshi = new Date();
    boshi.setHours(0, 0, 0, 0);
    boshi.setDate(boshi.getDate() - (days - 1));

    const answers = await prisma.userAnswer.findMany({
      where: { userId, answeredAt: { gte: boshi } },
      select: { isCorrect: true, answeredAt: true },
    });

    const kun = new Map<string, { total: number; correct: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(boshi);
      d.setDate(boshi.getDate() + i);
      kun.set(kunKaliti(d), { total: 0, correct: 0 });
    }
    for (const a of answers) {
      const g = kun.get(kunKaliti(a.answeredAt));
      if (!g) continue;
      g.total++;
      if (a.isCorrect) g.correct++;
    }

    const list = [...kun.entries()].map(([date, g]) => ({
      date,
      answered: g.total,
      correct: g.correct,
      accuracy: g.total ? Math.round((g.correct / g.total) * 100) : null, // javob yo'q kun — nuqta yo'q
    }));
    const bor = list.filter((x) => x.accuracy != null).map((x) => x.accuracy as number);
    res.json({
      list,
      best: bor.length ? Math.max(...bor) : null,
      worst: bor.length ? Math.min(...bor) : null,
    });
  })
);

/* ---------- Mening javoblarim (yengil ro'yxat) ---------- */
/**
 * O'quvchining HAR SAVOL bo'yicha OXIRGI javobi: savol raqami, tanlagan
 * variantlari va to'g'ri-noto'g'riligi.
 *
 * NIMA UCHUN ALOHIDA: `/solved` savollarning O'ZINI (matn, variantlar,
 * rasmlar bilan) qaytaradi — mingdan ortiq savolda bu juda og'ir. Test
 * oynasiga esa faqat shu uch maydon kerak: qayta kirganda yechilgan
 * savollar o'z rangida turadi va o'quvchi qolgan joydan davom etadi.
 *
 * FOYDALANUVCHIGA bog'langan (brauzer xotirasiga emas): ilova o'chirib
 * yoqilsa ham, boshqa telefondan kirilsa ham javoblar joyida qoladi va
 * bir telefonda ikki o'quvchi kirsa, har biri O'Z natijasini ko'radi.
 */
userRouter.get(
  '/progress/answers',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    // Sayt va ilovada bir xil — barcha javoblar (?manba=ilova e'tiborsiz)
    const answers = (await oxirgiJavoblar(userId)).sort((a, b) => +b.answeredAt - +a.answeredAt);

    const oxirgi = new Map<number, { chosen: number[]; isCorrect: boolean }>();
    for (const a of answers) {
      let chosen: number[] = [];
      try {
        chosen = JSON.parse(a.chosen || '[]');
      } catch {
        chosen = [];
      }
      oxirgi.set(a.questionId, { chosen, isCorrect: a.isCorrect });
    }

    res.json({
      list: [...oxirgi.entries()].map(([questionId, v]) => ({
        questionId,
        chosen: v.chosen,
        isCorrect: v.isCorrect,
      })),
    });
  })
);

/* ---------- Shablonlar bo'yicha progress ---------- */
/**
 * Har shablon uchun: nechta savol bor, nechtasiga javob berilgan, nechtasi
 * to'g'ri. Har savolda OXIRGI javob hisoblanadi — qayta yechib to'g'irlasa,
 * natija yaxshilanadi.
 */
userRouter.get(
  '/progress/shablon',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    // Sayt va ilovada bir xil — barcha javoblar (?manba=ilova e'tiborsiz)
    const oxirgi = new Map((await oxirgiJavoblar(userId)).map((a) => [a.questionId, a.isCorrect]));

    const savollar = await prisma.question.findMany({
      where: { status: 'published', shablon: { not: null } },
      select: { id: true, shablon: true },
    });

    const jam = new Map<number, { total: number; answered: number; correct: number }>();
    for (const q of savollar) {
      const sh = q.shablon as number;
      const g = jam.get(sh) || { total: 0, answered: 0, correct: 0 };
      g.total++;
      if (oxirgi.has(q.id)) {
        g.answered++;
        if (oxirgi.get(q.id)) g.correct++;
      }
      jam.set(sh, g);
    }

    const list = [...jam.entries()]
      .map(([shablon, g]) => ({
        shablon,
        ...g,
        percent: g.total ? Math.round((g.correct / g.total) * 100) : 0,
      }))
      .sort((a, b) => a.shablon - b.shablon);

    res.json({ list });
  })
);

/* ---------- Bog'lanish xabari ---------- */
/**
 * Aloqa formasidan kelgan xabar. Kirmagan mehmon ham yubora oladi, shuning
 * uchun requireUser YO'Q — lekin rate limiter (/api umumiy chegarasi) amal qiladi
 * va uzunliklar qat'iy cheklangan.
 */
userRouter.post(
  '/contact',
  ah(async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const phoneRaw = String(req.body?.phone || '').trim().slice(0, 30);
    const subject = String(req.body?.subject || '').trim().slice(0, 120);
    const text = String(req.body?.text || '').trim().slice(0, 2000);

    if (!name) return res.status(400).json({ error: 'Ismingizni kiriting' });
    if (!phoneRaw) return res.status(400).json({ error: 'Telefon raqamingizni kiriting' });
    if (text.length < 5) return res.status(400).json({ error: 'Xabar juda qisqa' });

    // Telefonni imkon qadar +998... ko'rinishiga keltiramiz, bo'lmasa borini saqlaymiz
    const phone = normPhone(phoneRaw) || phoneRaw;

    // Kirgan bo'lsa — kimligini ham yozib qo'yamiz (majburiy emas)
    const userId = optionalUserId(req);

    const saqlangan = await prisma.message.create({ data: { name, phone, subject, text, userId } });

    // Telegramga xabarnoma — javobni kutmaymiz, yuborilmasa ham xabar saqlangan
    telegramgaYubor(
      '\u{1F4E9} <b>Yangi xabar</b>\n\n' +
        '<b>Ism:</b> ' + esc(name) + '\n' +
        '<b>Telefon:</b> ' + esc(phone) + '\n' +
        (subject ? '<b>Mavzu:</b> ' + esc(subject) + '\n' : '') +
        '\n' + esc(text) + '\n\n' +
        '<a href="https://autostart.uz/xabarlar">Admin panelda ochish</a>'
    ).catch(() => { /* xabarnoma muhim emas */ });

    res.json({ ok: true, id: saqlangan.id });
  })
);

/* ---------- Hozir onlayn ---------- */
/**
 * Bir vaqtning o'zida nechta foydalanuvchi ishlayotgani.
 * lastSeen requireUser ichida daqiqada bir marta yangilanadi, shuning uchun
 * "onlayn" deb oxirgi 5 daqiqada faol bo'lganlarni hisoblaymiz.
 */
const ONLAYN_DAQIQA = 5;

userRouter.get(
  '/online',
  requireUser,
  ah(async (req, res) => {
    const chegara = new Date(Date.now() - ONLAYN_DAQIQA * 60 * 1000);
    const where = { lastSeen: { gte: chegara } };
    const count = await prisma.user.count({ where });

    // Owner va Admin KIMLIGINI ham ko'radi; oddiy talabaga faqat son.
    const meId = (req as any).userId as number;
    const men = await prisma.user.findUnique({ where: { id: meId }, select: { role: true } });
    const huquqli = men?.role === 'owner' || men?.role === 'admin';
    if (!huquqli) return res.json({ count, minutes: ONLAYN_DAQIQA });

    const list = await prisma.user.findMany({
      where,
      select: { id: true, firstName: true, role: true, lastSeen: true, tgId: true },
      orderBy: { lastSeen: 'desc' },
      take: 100,
    });
    res.json({
      count,
      minutes: ONLAYN_DAQIQA,
      list: list.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        role: u.role,
        lastSeen: u.lastSeen,
        mehmon: !!u.tgId?.startsWith('guest-'),
      })),
    });
  })
);

/* ---------- Reyting ---------- */
/**
 * Haqiqiy foydalanuvchilar reytingi.
 *
 * - Har savol bo'yicha OXIRGI javob hisoblanadi (bir savolga qayta-qayta javob
 *   berish natijani shishirmasin).
 * - Mehmon (qurilma bo'yicha vaqtinchalik) hisoblar chiqarilmaydi.
 * - Tartib: ANIQLIK (foiz) bo'yicha. Teng foizda ko'proq savol yechgani yuqori
 *   turadi — shunda 1 ta savolga to'g'ri javob bergan odam 100% bilan
 *   o'nlab savol yechgandan o'tib ketmaydi.
 */
/**
 * Reyting (har savolning OXIRGI javobi bo'yicha). Avval 600 mingdan ortiq javob har so'rovda
 * xotiraga yuklanib sanalardi (5–6 soniya, ~1 GB xotira) — endi baza o'zi hisoblaydi va
 * natija 1 daqiqa keshlanadi (bosh sahifa har ochilganda qayta hisoblanmaydi).
 */
const reytingKesh = keshla(60_000, () => reytingniHisobla(200));

/** Server ishga tushganda og'ir keshlarni oldindan to'ldirish — birinchi foydalanuvchi kutmasin */
export function keshlarniIsit() {
  reytingKesh.isit();
  xatoUlushlari.isit();
  nashrSavollari.isit();
  xatoStatistikasi.isit(); // admin "Tahlil" sahifasi
  // Dars muqovalari (yo'qlari) — birin-ketin, birinchi ochgan kutmasin
  void (async () => {
    const darslar = await prisma.lesson.findMany({ select: { fileName: true } });
    for (const d of darslar) await muqovaYasa(d.fileName);
  })().catch((e) => console.error('[muqova]', e?.message || e));
}
async function getRating(limit = 100) {
  return (await reytingKesh()).slice(0, limit);
}

async function reytingniHisobla(limit: number) {
  const rows = await prisma.$queryRaw<{ userId: number; total: number; correct: number }[]>`
    SELECT t."userId", count(*)::int AS total, count(*) FILTER (WHERE t."isCorrect")::int AS correct
    FROM (
      SELECT DISTINCT ON ("userId", "questionId") "userId", "isCorrect"
      FROM "UserAnswer"
      ORDER BY "userId", "questionId", "answeredAt" DESC, id DESC
    ) t
    GROUP BY t."userId"`;
  const jam = new Map(rows.map((r) => [r.userId, { total: r.total, correct: r.correct }]));
  if (!jam.size) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: [...jam.keys()] } },
    select: { id: true, firstName: true, tgId: true },
  });

  return users
    .filter((u) => !u.tgId?.startsWith('guest-')) // mehmonlar reytingga kirmaydi
    .map((u) => {
      const g = jam.get(u.id)!;
      return {
        userId: u.id,
        firstName: u.firstName,
        solved: g.total,
        correct: g.correct,
        accuracy: g.total ? Math.round((g.correct / g.total) * 100) : 0,
      };
    })
    // Tartib: 1) to'g'ri yechilgan savollar soni; 2) teng bo'lsa — ko'proq
    // savol ishlagan yuqorida (40 tadan 20 ta > 20 tadan 20 ta); 3) foiz.
    // Avval faqat foiz bo'yicha edi — 20 tadan 20 ta yechgan (100%) ko'p
    // ishlaganlardan oldinga o'tib ketardi.
    .sort(
      (a, b) =>
        b.correct - a.correct ||
        b.solved - a.solved ||
        b.accuracy - a.accuracy ||
        a.firstName.localeCompare(b.firstName)
    )
    .slice(0, limit)
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

userRouter.get(
  '/rating',
  requireUser,
  ah(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const list = await getRating(limit);
    res.json({ list, meId: (req as any).userId as number });
  })
);

userRouter.get(
  '/mistakes',
  requireUser,
  ah(async (req, res) => res.json(await getMistakes((req as any).userId)))
);

/* ---------- Saqlanganlar ---------- */
userRouter.get(
  '/bookmarks',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const bms = await prisma.bookmark.findMany({ where: { userId }, select: { questionId: true } });
    res.json(bms.map((b) => b.questionId));
  })
);

userRouter.post(
  '/bookmarks/:questionId',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const questionId = Number(req.params.questionId);
    const existing = await prisma.bookmark.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return res.json({ bookmarked: false });
    }
    await prisma.bookmark.create({ data: { userId, questionId } });
    res.json({ bookmarked: true });
  })
);

/* ---------- Yo'l belgilari (public; admin boshqaradi — routes/admin.ts) ---------- */
userRouter.get(
  '/signs',
  ah(async (_req, res) => {
    const rows = await prisma.roadSign.findMany({ where: { toifa: { gt: 0 } }, select: BELGI_TANLOV });
    res.json(rows.sort(belgiTartibi).map(belgiJson));
  })
);

/* Admin yuklagan belgi rasmi */
userRouter.get(
  '/signs/:id/image',
  ah(async (req, res) => {
    const img = await prisma.roadSignImage.findUnique({ where: { signId: Number(req.params.id) } });
    if (!img) return res.status(404).json({ error: 'Rasm yoʻq' });
    res.setHeader('Content-Type', img.mime || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // manzilda ?v= bor — almashtirilsa manzil o'zgaradi
    // SVG ichidagi skript to'g'ridan-to'g'ri ochilganda ham ishlamasin
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(img.data));
  })
);

/* ---------- Aksiyalar (Aloqa sahifasi; kirmagan mehmon ham ko'radi) ---------- */
userRouter.get(
  '/aksiyalar',
  ah(async (_req, res) => {
    const rows = await prisma.aksiya.findMany({ where: { faol: true }, orderBy: AKSIYA_TARTIBI, select: AKSIYA_TANLOV });
    res.json(rows.map(aksiyaJson));
  })
);

userRouter.get(
  '/aksiyalar/:id/rasm',
  ah(async (req, res) => {
    const img = await prisma.aksiyaRasm.findUnique({ where: { aksiyaId: Number(req.params.id) } });
    if (!img) return res.status(404).json({ error: 'Rasm yoʻq' });
    res.setHeader('Content-Type', img.mime || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // manzilda ?v= bor — almashtirilsa manzil o'zgaradi
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(img.data));
  })
);

/* ---------- Shikoyat ---------- */
userRouter.post(
  '/complaints',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const questionId = Number(req.body?.questionId);
    const reason = String(req.body?.reason || 'Sabab ko‘rsatilmagan');
    await prisma.complaint.create({ data: { userId, questionId, reason } });
    res.json({ ok: true });
  })
);

/* ---------- Savol muhokamasi (mobil ilova) ---------- */
/**
 * Foydalanuvchilar yozadigan kontent. App Store (1.2) va Google Play talabi:
 * haqoratli yozuvga shikoyat qilish va uni yashirish imkoni bo'lishi shart.
 * SHIKOYAT_CHEGARASI ta turli odam shikoyat qilsa izoh avtomat yashiriladi.
 * Bloklash ilovaning o'zida (foydalanuvchi qurilmasida) — bloklangan
 * odamning izohlari unga ko'rinmaydi.
 */
const SHIKOYAT_CHEGARASI = 3;
const IZOH_MAX = 500;

userRouter.get(
  '/questions/:id/comments',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const questionId = Number(req.params.id);
    const list = await prisma.questionComment.findMany({
      where: { questionId, hidden: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { firstName: true } } },
    });
    res.json(
      list.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        userId: c.userId,
        name: c.user?.firstName || 'Foydalanuvchi',
        mine: c.userId === userId,
      }))
    );
  })
);

userRouter.post(
  '/questions/:id/comments',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const questionId = Number(req.params.id);
    const text = String(req.body?.text || '').trim().slice(0, IZOH_MAX);
    if (!text) return res.status(400).json({ error: 'Izoh bo‘sh bo‘lmasin' });
    const savol = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!savol) return res.status(404).json({ error: 'Savol topilmadi' });
    // Spamga qarshi: bitta odam 15 soniyada bittadan ko'p yozolmaydi
    const oxirgi = await prisma.questionComment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (oxirgi && Date.now() - oxirgi.createdAt.getTime() < 15_000) {
      return res.status(429).json({ error: 'Biroz kuting — juda tez yozyapsiz' });
    }
    const c = await prisma.questionComment.create({
      data: { questionId, userId, text },
      include: { user: { select: { firstName: true } } },
    });
    res.json({
      id: c.id, text: c.text, createdAt: c.createdAt, userId: c.userId,
      name: c.user?.firstName || 'Foydalanuvchi', mine: true,
    });
  })
);

/** O'z izohini o'chirish */
userRouter.delete(
  '/comments/:id',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const id = Number(req.params.id);
    const c = await prisma.questionComment.findUnique({ where: { id }, select: { userId: true } });
    if (!c) return res.status(404).json({ error: 'Izoh topilmadi' });
    if (c.userId !== userId) return res.status(403).json({ error: 'Faqat o‘z izohingizni o‘chira olasiz' });
    await prisma.questionComment.delete({ where: { id } });
    res.json({ ok: true });
  })
);

/** Shikoyat — chegaraga yetsa izoh yashiriladi */
userRouter.post(
  '/comments/:id/report',
  requireUser,
  ah(async (req, res) => {
    const userId = (req as any).userId as number;
    const commentId = Number(req.params.id);
    const c = await prisma.questionComment.findUnique({ where: { id: commentId }, select: { userId: true } });
    if (!c) return res.status(404).json({ error: 'Izoh topilmadi' });
    if (c.userId === userId) return res.status(400).json({ error: 'O‘z izohingizga shikoyat qilib bo‘lmaydi' });
    await prisma.commentReport.upsert({
      where: { commentId_userId: { commentId, userId } },
      update: {},
      create: { commentId, userId },
    });
    const soni = await prisma.commentReport.count({ where: { commentId } });
    const yashirildi = soni >= SHIKOYAT_CHEGARASI;
    if (yashirildi) await prisma.questionComment.update({ where: { id: commentId }, data: { hidden: true } });
    res.json({ ok: true, hidden: yashirildi });
  })
);

/* ---------- Amaliy mashg'ulotlar (video darsliklar) ---------- */
/**
 * Foydalanuvchi faqat KO'RADI — joylash admin panelida (POST /admin/lessons).
 * Ro'yxatga fayl nomi qo'shilmaydi: video faqat /lessons/:id/video orqali beriladi,
 * shunda diskdagi tuzilma tashqariga oshkor bo'lmaydi.
 */
userRouter.get(
  '/lessons',
  ah(async (req, res) => {
    const category = String(req.query.category || '').trim();
    const where = { status: 'published', ...(category ? { category } : {}) };
    const list = await prisma.lesson.findMany({
      where,
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { id: 'desc' }],
      select: {
        id: true, title: true, description: true, category: true,
        order: true, sizeBytes: true, createdAt: true,
      },
    });
    // Toifa chiplarida "B (7)" ko'rinishi uchun — har toifada nechta dars bor
    const guruh = await prisma.lesson.groupBy({
      by: ['category'],
      where: { status: 'published' },
      _count: { _all: true },
    });
    const counts: Record<string, number> = {};
    for (const g of guruh) counts[g.category] = g._count._all;
    res.json({ list, counts, toifalar: TOIFALAR });
  })
);

/**
 * Dars muqovasi (ro'yxatdagi kichik rasm). Birinchi so'rovda yasaladi (~1 s), keyin diskdan.
 * Qoralama darslar ham — admin ro'yxatida ko'rinadi (rasm, videoning o'zi emas).
 */
userRouter.get(
  '/lessons/:id/poster',
  ah(async (req, res) => {
    const l = await prisma.lesson.findUnique({ where: { id: Number(req.params.id) }, select: { fileName: true } });
    if (!l) return res.status(404).json({ error: 'Dars yo‘q' });
    if (!(await muqovaYasa(l.fileName))) return res.status(404).json({ error: 'Muqova yo‘q' });
    res.sendFile(posterFilePath(l.fileName), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
  })
);

/**
 * Videoning o'zi. Savol rasmi/ovozi kabi ochiq (token talab qilmaydi) —
 * <video src> sarlavha yubora olmaydi, tokenni manzilga yozish esa uni
 * server jurnallariga tushirib yuborardi.
 *
 * res.sendFile Range so'rovlarini o'zi uddalaydi — foydalanuvchi videoni
 * o'rtasiga sura oladi va butun fayl birdan yuklanmaydi.
 */
userRouter.get(
  '/lessons/:id/video',
  ah(async (req, res) => {
    const l = await prisma.lesson.findUnique({ where: { id: Number(req.params.id) } });
    if (!l || l.status !== 'published') return res.status(404).json({ error: 'Video yo‘q' });
    // Avtodrom amaliy mashg'ulotlari — Premium tarifda; har toifaning birinchi darsi namuna
    if (kalitDarajasi(req.query.k) < IMKONIYAT_DARAJA.avtodrom) {
      const birinchi = await prisma.lesson.findFirst({ where: { status: 'published', category: l.category }, orderBy: [{ order: 'asc' }, { id: 'desc' }], select: { id: true } });
      if (birinchi?.id !== l.id) return res.status(403).json({ error: 'Amaliy mashg‘ulotlar Premium tarifida', tarif: 'premium' });
    }

    // Sayt ham, ilova ham siqilgan 720p nusxani oladi (asl 4K — 20–30 Mbit/s, sekin ochilardi).
    // Nusxa hali tayyor bo'lmasa asl fayl ketadi — video baribir ochiladi. `?asl=1` — asl fayl.
    const mobil = req.query.asl !== '1' && mobilNusxaBormi(l.fileName);
    const fayl = mobil ? mobilFilePath(l.fileName) : lessonFilePath(l.fileName);
    if (!fs.existsSync(fayl)) return res.status(404).json({ error: 'Video fayli topilmadi' });
    res.sendFile(
      fayl,
      {
        acceptRanges: true,
        headers: { 'Content-Type': mobil ? 'video/mp4' : (l.mime || 'video/mp4'), 'Cache-Control': 'private, max-age=604800' },
      },
      (err) => {
        // Foydalanuvchi videoni yopsa uzilish normal holat — faqat haqiqiy
        // xatoda javob qaytaramiz (sarlavha hali ketmagan bo'lsa).
        if (err && !res.headersSent) res.status(404).json({ error: 'Videoni o‘qib bo‘lmadi' });
      }
    );
  })
);
