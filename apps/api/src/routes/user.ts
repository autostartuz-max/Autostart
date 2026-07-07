import { Router, Request, Response, NextFunction } from 'express';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { prisma } from '../prisma';
import { BOT_TOKEN, DEV_AUTH } from '../env';
import { verifyTelegramInitData, signUserToken, requireUser } from '../auth';

export const userRouter = Router();

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

    // 2) Telegram foydalanuvchisi aniqlanmadi — DEV rejimda demo, aks holda rad etamiz
    if (!tgId) {
      if (!DEV_AUTH) return res.status(401).json({ error: 'Telegram maʼlumoti yoʻq' });
      tgId = 'dev-user';
      firstName = 'Demo foydalanuvchi';
    }

    const user = await prisma.user.upsert({
      where: { tgId },
      update: { firstName, avatarUrl },
      create: { tgId, firstName, avatarUrl },
    });
    res.json({ token: signUserToken(user.id), user });
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
      user,
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
    const { alphabet, category, lang } = req.body || {};
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(alphabet ? { alphabet } : {}),
        ...(category ? { category } : {}),
        ...(lang ? { lang } : {}),
      },
    });
    res.json({ user });
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
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const base: any = { status: 'published' };
    if (topicId) base.topicId = topicId;
    if (ticketId) base.ticketId = ticketId;
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
      orderBy: { id: 'asc' },
    });

    if (mode === 'exam' || mode === 'random' || mode === '50' || mode === '100') {
      const n = limit || (mode === '100' ? 100 : mode === '50' ? 50 : 20);
      questions = shuffle(questions).slice(0, n);
    } else if (limit) {
      questions = questions.slice(0, limit);
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
    select: { questionId: true, isCorrect: true },
  });
  const latest = new Map<number, boolean>();
  for (const a of answers) if (!latest.has(a.questionId)) latest.set(a.questionId, a.isCorrect);
  const wrongIds = [...latest.entries()].filter(([, ok]) => !ok).map(([qid]) => qid);
  if (!wrongIds.length) return [];
  return prisma.question.findMany({
    where: { id: { in: wrongIds } },
    include: questionInclude,
  });
}

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
