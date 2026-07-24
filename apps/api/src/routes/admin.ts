import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { prisma } from '../prisma';
import { signAdminToken, requireAdmin } from '../auth';

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ah =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

interface OptionInput {
  textLat: string;
  textCyr?: string;
  isCorrect?: boolean;
  wrongReason?: string;
}

/* ---------- Login ---------- */
adminRouter.post(
  '/login',
  ah(async (req, res) => {
    const { login, password } = req.body || {};
    const admin = await prisma.adminUser.findUnique({ where: { login: String(login || '') } });
    if (!admin) return res.status(401).json({ error: 'Login yoki parol xato' });
    const ok = await bcrypt.compare(String(password || ''), admin.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Login yoki parol xato' });
    res.json({ token: signAdminToken(admin.id, admin.role), admin: { login: admin.login, role: admin.role } });
  })
);

adminRouter.use(requireAdmin);

/* ---------- Statistika ---------- */
adminRouter.get(
  '/stats',
  ah(async (_req, res) => {
    const [questions, users, topics, tickets, complaints] = await Promise.all([
      prisma.question.count(),
      prisma.user.count(),
      prisma.topic.count(),
      prisma.ticket.count(),
      prisma.complaint.count({ where: { status: 'new' } }),
    ]);
    res.json({ questions, users, topics, tickets, newComplaints: complaints });
  })
);

/* ---------- Savollar ---------- */
adminRouter.get(
  '/questions',
  ah(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const topicId = req.query.topicId ? Number(req.query.topicId) : undefined;
    const where: any = {};
    if (q) where.textLat = { contains: q };
    if (topicId) where.topicId = topicId;
    const questions = await prisma.question.findMany({
      where,
      include: { options: { orderBy: { order: 'asc' } }, topic: true, ticket: true, category: true },
      orderBy: { id: 'desc' },
      take: 300,
    });
    res.json(questions);
  })
);

adminRouter.get(
  '/questions/:id',
  ah(async (req, res) => {
    const question = await prisma.question.findUnique({
      where: { id: Number(req.params.id) },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    if (!question) return res.status(404).json({ error: 'Topilmadi' });
    res.json(question);
  })
);

function questionData(body: any) {
  return {
    textLat: String(body.textLat || '').trim(),
    textCyr: String(body.textCyr || '').trim(),
    explanation: String(body.explanation || '').trim(),
    ruleRef: body.ruleRef ? String(body.ruleRef) : null,
    difficulty: Number(body.difficulty || 1),
    isNumeric: !!body.isNumeric,
    isTricky: !!body.isTricky,
    status: body.status === 'draft' ? 'draft' : 'published',
    categoryId: body.categoryId ? Number(body.categoryId) : null,
    topicId: body.topicId ? Number(body.topicId) : null,
    ticketId: body.ticketId ? Number(body.ticketId) : null,
  };
}

adminRouter.post(
  '/questions',
  ah(async (req, res) => {
    const data = questionData(req.body);
    if (!data.textLat) return res.status(400).json({ error: 'Savol matni bo‘sh' });
    const options: OptionInput[] = req.body.options || [];
    if (options.length < 2) return res.status(400).json({ error: 'Kamida 2 ta variant kerak' });
    if (!options.some((o) => o.isCorrect)) return res.status(400).json({ error: 'To‘g‘ri javob belgilanmagan' });

    const question = await prisma.question.create({
      data: {
        ...data,
        options: {
          create: options.map((o, i) => ({
            textLat: String(o.textLat || '').trim(),
            textCyr: String(o.textCyr || '').trim(),
            isCorrect: !!o.isCorrect,
            wrongReason: o.wrongReason ? String(o.wrongReason) : null,
            order: i,
          })),
        },
      },
      include: { options: true },
    });
    res.json(question);
  })
);

adminRouter.put(
  '/questions/:id',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const data = questionData(req.body);
    const options: OptionInput[] = req.body.options || [];
    await prisma.option.deleteMany({ where: { questionId: id } });
    const question = await prisma.question.update({
      where: { id },
      data: {
        ...data,
        options: {
          create: options.map((o, i) => ({
            textLat: String(o.textLat || '').trim(),
            textCyr: String(o.textCyr || '').trim(),
            isCorrect: !!o.isCorrect,
            wrongReason: o.wrongReason ? String(o.wrongReason) : null,
            order: i,
          })),
        },
      },
      include: { options: true },
    });
    res.json(question);
  })
);

adminRouter.delete(
  '/questions/:id',
  ah(async (req, res) => {
    await prisma.question.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  })
);

/* ---------- Savol ovozi (Tushuncha uchun) ---------- */
adminRouter.post(
  '/questions/:id/audio',
  upload.single('audio'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    await prisma.questionAudio.upsert({
      where: { questionId: id },
      update: { data: req.file.buffer, mime: req.file.mimetype || 'audio/mpeg' },
      create: { questionId: id, data: req.file.buffer, mime: req.file.mimetype || 'audio/mpeg' },
    });
    await prisma.question.update({ where: { id }, data: { hasAudio: true } });
    res.json({ ok: true, hasAudio: true });
  })
);

adminRouter.delete(
  '/questions/:id/audio',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.questionAudio.deleteMany({ where: { questionId: id } });
    await prisma.question.update({ where: { id }, data: { hasAudio: false } });
    res.json({ ok: true, hasAudio: false });
  })
);

/* ---------- Savol rasmi (test oynasida ko'rsatiladi) ---------- */
adminRouter.post(
  '/questions/:id/image',
  upload.single('image'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    await prisma.questionImage.upsert({
      where: { questionId: id },
      update: { data: req.file.buffer, mime: req.file.mimetype || 'image/jpeg' },
      create: { questionId: id, data: req.file.buffer, mime: req.file.mimetype || 'image/jpeg' },
    });
    await prisma.question.update({ where: { id }, data: { imageUrl: `/api/questions/${id}/image` } });
    res.json({ ok: true, imageUrl: `/api/questions/${id}/image` });
  })
);

adminRouter.delete(
  '/questions/:id/image',
  ah(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.questionImage.deleteMany({ where: { questionId: id } });
    await prisma.question.update({ where: { id }, data: { imageUrl: null } });
    res.json({ ok: true });
  })
);

/* ---------- Katalog (mavzu / bilet / toifa) ---------- */
for (const [path, model] of [
  ['topics', 'topic'],
  ['tickets', 'ticket'],
  ['categories', 'category'],
] as const) {
  adminRouter.get(
    `/${path}`,
    ah(async (_req, res) => res.json(await (prisma as any)[model].findMany({ orderBy: { id: 'asc' } })))
  );
  adminRouter.post(
    `/${path}`,
    ah(async (req, res) => {
      const created = await (prisma as any)[model].create({ data: req.body });
      res.json(created);
    })
  );
  adminRouter.delete(
    `/${path}/:id`,
    ah(async (req, res) => {
      await (prisma as any)[model].delete({ where: { id: Number(req.params.id) } });
      res.json({ ok: true });
    })
  );
}

/* ---------- Shikoyatlar ---------- */
adminRouter.get(
  '/complaints',
  ah(async (_req, res) =>
    res.json(
      await prisma.complaint.findMany({
        orderBy: { createdAt: 'desc' },
        include: { question: { select: { textLat: true } } },
        take: 200,
      })
    )
  )
);

/* ---------- Excel / CSV import ----------
   Ustunlar (sarlavha qatori): savol | savol_kiril | izoh | toifa | mavzu |
   variant1 | variant2 | variant3 | variant4 | javob (to'g'ri variant raqami 1-4)
*/
adminRouter.post(
  '/questions/import',
  upload.single('file'),
  ah(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const norm = (r: any) => {
      const o: any = {};
      for (const k of Object.keys(r)) o[k.toString().trim().toLowerCase()] = r[k];
      return o;
    };

    const errors: { row: number; message: string }[] = [];
    let inserted = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = norm(rows[i]);
      const rowNo = i + 2; // sarlavha qatoridan keyin
      const text = String(r['savol'] || '').trim();
      const variants = [r['variant1'], r['variant2'], r['variant3'], r['variant4']]
        .map((v) => String(v || '').trim())
        .filter(Boolean);
      const correct = Number(r['javob']);

      if (!text) {
        errors.push({ row: rowNo, message: 'Savol matni bo‘sh' });
        continue;
      }
      if (variants.length < 2) {
        errors.push({ row: rowNo, message: 'Kamida 2 ta variant kerak' });
        continue;
      }
      if (!correct || correct < 1 || correct > variants.length) {
        errors.push({ row: rowNo, message: `"javob" ustuni noto‘g‘ri (1-${variants.length} orasida bo‘lsin)` });
        continue;
      }

      let categoryId: number | null = null;
      const catCode = String(r['toifa'] || '').trim().toUpperCase();
      if (catCode) {
        const cat = await prisma.category.upsert({
          where: { code: catCode },
          update: {},
          create: { code: catCode, name: `${catCode} toifasi` },
        });
        categoryId = cat.id;
      }
      let topicId: number | null = null;
      const topicName = String(r['mavzu'] || '').trim();
      if (topicName) {
        let topic = await prisma.topic.findFirst({ where: { name: topicName } });
        if (!topic) topic = await prisma.topic.create({ data: { name: topicName } });
        topicId = topic.id;
      }

      await prisma.question.create({
        data: {
          textLat: text,
          textCyr: String(r['savol_kiril'] || '').trim(),
          explanation: String(r['izoh'] || '').trim(),
          categoryId,
          topicId,
          options: {
            create: variants.map((v, idx) => ({ textLat: v, isCorrect: idx + 1 === correct, order: idx })),
          },
        },
      });
      inserted++;
    }

    res.json({ inserted, total: rows.length, errors });
  })
);
