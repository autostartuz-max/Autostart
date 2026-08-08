import { Router, Request, Response, NextFunction } from 'express';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { BOT_TOKEN, DEV_AUTH } from '../env';
import { verifyTelegramInitData, signUserToken, requireUser } from '../auth';
import { shifrla } from '../passwordVault';

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
  return rest;
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

    // 2) Telegram foydalanuvchisi aniqlanmadi — web saytda qurilma bo'yicha mehmon hisobi
    if (!tgId) {
      const guestId = req.body?.guestId ? String(req.body.guestId).slice(0, 80) : '';
      if (guestId) {
        tgId = 'guest-' + guestId;
        firstName = 'Mehmon';
      } else if (DEV_AUTH) {
        tgId = 'dev-user';
        firstName = 'Demo foydalanuvchi';
      } else {
        return res.status(401).json({ error: 'Maʼlumot yoʻq' });
      }
    }

    const user = await prisma.user.upsert({
      where: { tgId },
      update: { firstName, avatarUrl },
      create: { tgId, firstName, avatarUrl },
    });
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

    const user = await prisma.user.create({
      data: {
        phone, email, firstName: name,
        passwordHash: bcrypt.hashSync(password, 10),
        passwordEnc: shifrla(password), // admin panelida ko'rsatish uchun
      },
    });
    res.json({ token: signUserToken(user.id), user: safeUser(user) });
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
    const a = await prisma.questionAudio.findUnique({ where: { questionId: Number(req.params.id) } });
    if (!a) return res.status(404).json({ error: 'Ovoz yoʻq' });
    res.setHeader('Content-Type', a.mime || 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(a.data));
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
    const total = await prisma.userAnswer.count({ where: { userId } });
    const correct = await prisma.userAnswer.count({ where: { userId, isCorrect: true } });
    const solvedQuestions = await prisma.userAnswer.findMany({
      where: { userId },
      distinct: ['questionId'],
      select: { questionId: true },
    });
    const bookmarks = await prisma.bookmark.count({ where: { userId } });
    const totalQuestions = await prisma.question.count({ where: { status: 'published' } });
    res.json({
      user: user ? safeUser(user) : user,
      stats: {
        answered: total,
        correct,
        wrong: total - correct,
        solvedQuestions: solvedQuestions.length,
        bookmarks,
        totalQuestions,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
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
    const { alphabet, category, lang } = req.body || {};
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(alphabet ? { alphabet } : {}),
        ...(category ? { category } : {}),
        ...(lang ? { lang } : {}),
      },
    });
    res.json({ user: safeUser(user) });
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

    const base: any = { status: 'published' };
    if (topicId) base.topicId = topicId;
    if (ticketId) base.ticketId = ticketId;
    if (shablon) base.shablon = shablon;
    if (mode === 'tricky') base.isTricky = true;
    if (mode === 'numeric') base.isNumeric = true;

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

    let questions = await prisma.question.findMany({
      where: base,
      include: questionInclude,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });

    // XAVFSIZLIK (ko'chirishga qarshi): bitta so'rovda butun savol banki
    // qaytarilmaydi. Avval mode=all HAMMA 1238 savolni javoblari bilan berardi —
    // obunachi ham bir so'rovda hammasini ko'chirib olardi. Endi qat'iy cheklov:
    // eng ko'pi MAX ta (test uchun yetarli: shablon=20, imtihon=20/50/100).
    const MAX = 120;
    // Random test bo'limi 200 tagacha so'raydi (20/50/100/200) — shu rejimga alohida
    // yuqori shift. Bank 1238 ta, ya'ni 200 ham bankning oltidan biri: ko'chirishga
    // qarshi himoya kuchida qoladi.
    const RANDOM_MAX = 200;
    if (shablon) {
      // Shablon test: bitta bilet (20 ta), tartib bo'yicha — cheklov ichida
      questions = questions.slice(0, MAX);
    } else if (mode === 'exam' || mode === 'random' || mode === '50' || mode === '100') {
      const cap = mode === 'random' ? RANDOM_MAX : MAX;
      const n = Math.min(limit || (mode === '100' ? 100 : mode === '50' ? 50 : 20), cap);
      questions = shuffle(questions).slice(0, n);
    } else {
      // mode=all / mavzu / bilet mashqi — baribir cheklanadi (butun bank emas)
      const n = Math.min(limit || MAX, MAX);
      questions = questions.slice(0, n);
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

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
    if (!question) return res.status(404).json({ error: 'Savol topilmadi' });

    const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
    const isCorrect = sameSet(chosen, correctIds);

    await prisma.userAnswer.create({
      data: { userId, questionId, isCorrect, chosen: JSON.stringify(chosen), timeMs },
    });

    res.json({ isCorrect, correctOptionIds: correctIds });
  })
);

// To'g'ri yechilmagan (xato yoki umuman javob berilmagan) savollar
async function getPractice(userId: number) {
  const all = await prisma.question.findMany({
    where: { status: 'published' },
    include: questionInclude,
    orderBy: { id: 'asc' },
  });
  const answers = await prisma.userAnswer.findMany({
    where: { userId },
    orderBy: { answeredAt: 'desc' },
    select: { questionId: true, isCorrect: true },
  });
  const latest = new Map<number, boolean>();
  for (const a of answers) if (!latest.has(a.questionId)) latest.set(a.questionId, a.isCorrect);
  return all.filter((q) => latest.get(q.id) !== true);
}

async function getMistakes(userId: number) {
  const answers = await prisma.userAnswer.findMany({
    where: { userId },
    orderBy: { answeredAt: 'desc' },
    select: { questionId: true, isCorrect: true, chosen: true },
  });
  const latest = new Map<number, { ok: boolean; chosen: string }>();
  for (const a of answers)
    if (!latest.has(a.questionId)) latest.set(a.questionId, { ok: a.isCorrect, chosen: a.chosen });
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

/* ---------- Reyting ---------- */
/**
 * Haqiqiy foydalanuvchilar reytingi.
 *
 * - Har savol bo'yicha OXIRGI javob hisoblanadi (bir savolga qayta-qayta javob
 *   berish natijani shishirmasin).
 * - Mehmon (qurilma bo'yicha vaqtinchalik) hisoblar chiqarilmaydi.
 * - Tartib: to'g'ri javoblar soni, keyin aniqlik. Faqat foiz bo'yicha saralasak,
 *   1 ta savolga to'g'ri javob bergan odam 100% bilan birinchi chiqib qolardi.
 */
async function getRating(limit = 100) {
  const answers = await prisma.userAnswer.findMany({
    select: { userId: true, questionId: true, isCorrect: true },
    orderBy: { answeredAt: 'desc' },
  });

  const korilgan = new Set<string>();
  const jam = new Map<number, { total: number; correct: number }>();
  for (const a of answers) {
    const k = a.userId + ':' + a.questionId;
    if (korilgan.has(k)) continue; // faqat oxirgi javob
    korilgan.add(k);
    const g = jam.get(a.userId) || { total: 0, correct: 0 };
    g.total++;
    if (a.isCorrect) g.correct++;
    jam.set(a.userId, g);
  }
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
    .sort((a, b) => b.correct - a.correct || b.accuracy - a.accuracy || a.firstName.localeCompare(b.firstName))
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

/* ---------- Yo'l belgilari ---------- */
userRouter.get(
  '/signs',
  ah(async (_req, res) => res.json(await prisma.roadSign.findMany({ orderBy: { id: 'asc' } })))
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
