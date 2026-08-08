import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { prisma } from '../prisma';
import { signAdminToken, requireAdmin, requireOwner } from '../auth';
import { GEMINI_API_KEY, GEMINI_IMAGE_MODEL, GROQ_API_KEY, GROQ_VISION_MODEL, OPENAI_API_KEY, OPENAI_VISION_MODEL } from '../env';

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ah =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

// Vision chat (OpenAI-mos API) chaqiruvi — content matnini qaytaradi
async function callVisionChat(url: string, key: string, body: any): Promise<string> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error('vision ' + r.status + ': ' + (await r.text()).slice(0, 150));
  const data: any = await r.json();
  return data?.choices?.[0]?.message?.content || '';
}

interface OptionInput {
  textLat: string;
  textCyr?: string;
  textRus?: string;
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

/* ---------- Foydalanuvchilar va rollar (FAQAT owner) ---------- */

// owner — to'liq huquq, admin — faqat savollar, user — oddiy talaba
const ROLES = ['owner', 'admin', 'user'] as const;
const userSelect = {
  id: true, firstName: true, phone: true, email: true, tgId: true, role: true, createdAt: true,
  // passwordHash ATAYLAB yo'q — parol hashi hech qachon javobga tushmasin
};
// Batafsil ko'rinish va tahrirlash javobi uchun — sozlamalar ham qo'shiladi
const userDetailSelect = {
  ...userSelect, lang: true, alphabet: true, category: true, examDate: true,
};

// Ro'yxat (ism yoki telefon bo'yicha qidiruv)
adminRouter.get(
  '/users',
  requireOwner,
  ah(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ role: 'asc' }, { id: 'desc' }], // adminlar tepada
      take: 200,
    });
    // O'z satrini UI da ajratish uchun — kim so'rayotganini qaytaramiz
    res.json({ users, meId: (req as any).userId ?? null });
  })
);

// Telefon/pochtani tekshirish — user.ts dagi qoidalar bilan bir xil
function normPhone(raw: any): string | null {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  if (d.startsWith('998') && d.length === 12) return '+' + d;
  return null;
}
function normEmail(raw: any): string | null {
  const e = String(raw || '').trim().toLowerCase();
  if (!e || e.length > 120) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

// Yangi foydalanuvchi qo'shish
adminRouter.post(
  '/users',
  requireOwner,
  ah(async (req, res) => {
    const name = String(req.body?.firstName || '').trim().slice(0, 60);
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'user');
    const phoneRaw = String(req.body?.phone || '').trim();
    const emailRaw = String(req.body?.email || '').trim();

    if (!name) return res.status(400).json({ error: 'Ismni kiriting' });
    if (!ROLES.includes(role as any)) return res.status(400).json({ error: 'Role noto‘g‘ri' });
    if (!phoneRaw && !emailRaw) return res.status(400).json({ error: 'Telefon yoki pochta kiriting' });
    if (password.length < 4) return res.status(400).json({ error: 'Parol kamida 4 ta belgidan iborat bo‘lsin' });

    const phone = phoneRaw ? normPhone(phoneRaw) : null;
    if (phoneRaw && !phone) return res.status(400).json({ error: 'Telefon raqami noto‘g‘ri' });
    const email = emailRaw ? normEmail(emailRaw) : null;
    if (emailRaw && !email) return res.status(400).json({ error: 'Pochta manzili noto‘g‘ri' });

    if (phone && (await prisma.user.findUnique({ where: { phone } })))
      return res.status(409).json({ error: 'Bu raqam allaqachon ro‘yxatdan o‘tgan' });
    if (email && (await prisma.user.findUnique({ where: { email } })))
      return res.status(409).json({ error: 'Bu pochta allaqachon ro‘yxatdan o‘tgan' });

    const user = await prisma.user.create({
      data: { firstName: name, phone, email, role, passwordHash: bcrypt.hashSync(password, 10) },
      select: userSelect,
    });
    res.json({ user });
  })
);

// Tahrirlash — ism, telefon, pochta, ixtiyoriy yangi parol
adminRouter.patch(
  '/users/:id',
  requireOwner,
  ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID noto‘g‘ri' });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const data: any = {};

    if (req.body?.firstName !== undefined) {
      const name = String(req.body.firstName).trim().slice(0, 60);
      if (!name) return res.status(400).json({ error: 'Ismni kiriting' });
      data.firstName = name;
    }

    if (req.body?.phone !== undefined) {
      const raw = String(req.body.phone).trim();
      if (!raw) data.phone = null;
      else {
        const phone = normPhone(raw);
        if (!phone) return res.status(400).json({ error: 'Telefon raqami noto‘g‘ri' });
        const band = await prisma.user.findUnique({ where: { phone } });
        if (band && band.id !== id) return res.status(409).json({ error: 'Bu raqam boshqa hisobda band' });
        data.phone = phone;
      }
    }

    if (req.body?.email !== undefined) {
      const raw = String(req.body.email).trim();
      if (!raw) data.email = null;
      else {
        const email = normEmail(raw);
        if (!email) return res.status(400).json({ error: 'Pochta manzili noto‘g‘ri' });
        const band = await prisma.user.findUnique({ where: { email } });
        if (band && band.id !== id) return res.status(409).json({ error: 'Bu pochta boshqa hisobda band' });
        data.email = email;
      }
    }

    if (req.body?.password) {
      const p = String(req.body.password);
      if (p.length < 4) return res.status(400).json({ error: 'Parol kamida 4 ta belgidan iborat bo‘lsin' });
      data.passwordHash = bcrypt.hashSync(p, 10);
    }

    // Sozlamalar: til, alifbo, toifa, imtihon sanasi
    if (req.body?.lang !== undefined) {
      const l = String(req.body.lang);
      if (!['uz', 'ru'].includes(l)) return res.status(400).json({ error: 'Til noto‘g‘ri' });
      data.lang = l;
    }
    if (req.body?.alphabet !== undefined) {
      const a = String(req.body.alphabet);
      if (!['lat', 'cyr'].includes(a)) return res.status(400).json({ error: 'Alifbo noto‘g‘ri' });
      data.alphabet = a;
    }
    if (req.body?.category !== undefined) {
      const c = String(req.body.category).trim().toUpperCase();
      // Bazadagi toifalar + foydalanuvchining hozirgi qiymati (eski yozuvlar
      // ro'yxatda bo'lmasligi mumkin — ularni saqlab qolamiz)
      const kodlar = (await prisma.category.findMany({ select: { code: true } })).map((x) => x.code);
      if (!c || (!kodlar.includes(c) && c !== target.category)) {
        return res.status(400).json({ error: `Toifa noto‘g‘ri. Mavjud: ${kodlar.join(', ')}` });
      }
      data.category = c;
    }
    if (req.body?.examDate !== undefined) {
      const raw = String(req.body.examDate).trim();
      if (!raw) data.examDate = null;
      else {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Imtihon sanasi noto‘g‘ri' });
        data.examDate = d;
      }
    }

    // Telefon ham, pochta ham qolmasa — hisobga kirib bo'lmay qoladi
    const yangiPhone = 'phone' in data ? data.phone : target.phone;
    const yangiEmail = 'email' in data ? data.email : target.email;
    if (!yangiPhone && !yangiEmail && !target.tgId) {
      return res.status(400).json({ error: 'Telefon yoki pochtadan kamida bittasi qolishi kerak' });
    }

    if (!Object.keys(data).length) return res.status(400).json({ error: 'O‘zgartirish yo‘q' });

    const user = await prisma.user.update({ where: { id }, data, select: userDetailSelect });
    res.json({ user });
  })
);

// O'chirish — javoblar, saqlanganlar va shikoyatlar ham birga o'chadi (Cascade)
adminRouter.delete(
  '/users/:id',
  requireOwner,
  ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID noto‘g‘ri' });

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const meId = (req as any).userId as number | undefined;
    if (meId && meId === id) return res.status(400).json({ error: 'O‘z hisobingizni o‘chira olmaysiz' });

    if (target.role === 'owner') {
      const ownerlar = await prisma.user.count({ where: { role: 'owner' } });
      if (ownerlar <= 1) return res.status(400).json({ error: 'Bu oxirgi Owner — o‘chirib bo‘lmaydi' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ ok: true, id });
  })
);

// Bitta foydalanuvchi — batafsil ma'lumot va statistika
adminRouter.get(
  '/users/:id',
  requireOwner,
  ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID noto‘g‘ri' });

    const user = await prisma.user.findUnique({ where: { id }, select: userDetailSelect });
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const [answered, correct, solved, bookmarks, complaints, oxirgi, birinchi] = await Promise.all([
      prisma.userAnswer.count({ where: { userId: id } }),
      prisma.userAnswer.count({ where: { userId: id, isCorrect: true } }),
      prisma.userAnswer.findMany({ where: { userId: id }, distinct: ['questionId'], select: { questionId: true } }),
      prisma.bookmark.count({ where: { userId: id } }),
      prisma.complaint.count({ where: { userId: id } }),
      prisma.userAnswer.findFirst({ where: { userId: id }, orderBy: { answeredAt: 'desc' }, select: { answeredAt: true } }),
      prisma.userAnswer.findFirst({ where: { userId: id }, orderBy: { answeredAt: 'asc' }, select: { answeredAt: true } }),
    ]);

    res.json({
      user,
      stats: {
        answered,
        correct,
        wrong: answered - correct,
        accuracy: answered ? Math.round((correct / answered) * 100) : 0,
        solvedQuestions: solved.length,
        bookmarks,
        complaints,
        lastActive: oxirgi?.answeredAt ?? null,
        firstActive: birinchi?.answeredAt ?? null,
      },
    });
  })
);

// Role almashtirish — faqat owner
adminRouter.patch(
  '/users/:id/role',
  requireOwner,
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const role = String(req.body?.role || '');
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID noto‘g‘ri' });
    if (!ROLES.includes(role as any)) return res.status(400).json({ error: 'Role noto‘g‘ri' });

    const target = await prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!target) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    // 1) O'z rolini o'zgartirib bo'lmaydi — tasodifan o'zini tushirib qulflanib qolmasin
    const meId = (req as any).userId as number | undefined;
    if (meId && meId === id) {
      return res.status(400).json({ error: 'O‘z rolingizni o‘zgartira olmaysiz' });
    }

    // 2) Mehmon (qurilma bo'yicha vaqtinchalik hisob) huquq ololmaydi
    if (role !== 'user' && target.tgId?.startsWith('guest-')) {
      return res.status(400).json({ error: 'Mehmon hisobiga huquq berib bo‘lmaydi' });
    }

    // 3) Oxirgi owner'ni tushirib bo'lmaydi — tizim egasiz qolib ketmasin
    if (target.role === 'owner' && role !== 'owner') {
      const ownerlar = await prisma.user.count({ where: { role: 'owner' } });
      if (ownerlar <= 1) {
        return res.status(400).json({ error: 'Bu oxirgi Owner — rolini olib bo‘lmaydi' });
      }
    }

    const user = await prisma.user.update({ where: { id }, data: { role }, select: userSelect });
    res.json({ user });
  })
);

/* ---------- Skrinshotdan savolni AI (Groq vision) bilan o'qish ---------- */
adminRouter.post(
  '/extract-question',
  upload.single('image'),
  ah(async (req, res) => {
    if (!GROQ_API_KEY && !OPENAI_API_KEY) return res.status(400).json({ error: 'AI kaliti sozlanmagan' });
    const file = (req as any).file as { buffer: Buffer; mimetype?: string } | undefined;
    if (!file) return res.status(400).json({ error: 'Rasm yuborilmadi' });
    const dataUrl = `data:${file.mimetype || 'image/png'};base64,${file.buffer.toString('base64')}`;
    const topics = await prisma.topic.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } });
    const topicStr = topics.map((t) => `${t.id}:${t.name}`).join(', ');
    const prompt =
      "Bu O'zbekiston YHQ test savoli skrinshoti. Undan aniq o'qib FAQAT JSON qaytar (boshqa gap yozma). Kalitlar: " +
      "textLat (savol matni; boshidagi raqamni masalan '16.' olib tashla), " +
      "options (javob variantlari — FAQAT F1/F2/F3/F4 yonidagi matnlar; 'Izohni ko'rish','Izoh','Qoida','Tushuncha' kabi tugma/havolalarni KIRITMA), " +
      "shablon (BILET yoki SHABLON RAQAMI — faqat raqam, masalan tepada '1 - Bilet' bo'lsa 1; raqam yoki null), " +
      "tartib (JORIY savol raqami — pastdagi navigatsiya raqamlaridan KO'K rangda ajratib ko'rsatilgani; QIZIL raqamlar oldingi javoblar, ularni OLMA; yoki savol boshidagi 'N.'; raqam yoki null), " +
      "correctIndex (to'g'ri javob indeksi 0 dan; skrinshotda javob YASHIL bo'lsa to'g'ri, QIZIL xato; rang ko'rsatilmagan bo'lsa null), " +
      "izoh (izoh/qoida matni skrinshotda KO'RINSA o'sha to'liq matn, ko'rinmasa null; 'Izohlar test sifatida...' ogohlantirishini KIRITMA), " +
      "topicId (savolga eng mos mavzu raqami, FAQAT shu ro'yxatdan: [" + topicStr + "]). " +
      "DIQQAT: 'N - Bilet' dagi N = shablon; pastdagi KO'K raqam = joriy savol = tartib — ADASHTIRMA. Matnni aynan skrinshotdagidek yoz: o' va g' harflarini saqla.";
    const messages = [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: dataUrl } },
    ] }];
    try {
      let content = '';
      // 1) OpenAI (aniqroq) — kalit bor bo'lsa asosiy
      if (OPENAI_API_KEY) {
        try {
          content = await callVisionChat('https://api.openai.com/v1/chat/completions', OPENAI_API_KEY,
            { model: OPENAI_VISION_MODEL, messages, max_tokens: 900, temperature: 0 });
        } catch { /* OpenAI ishlamasa — Groq zaxirasiga o'tamiz */ }
      }
      // 2) Groq (bepul zaxira)
      if (!content && GROQ_API_KEY) {
        content = await callVisionChat('https://api.groq.com/openai/v1/chat/completions', GROQ_API_KEY,
          { model: GROQ_VISION_MODEL, reasoning_effort: 'none', messages, max_tokens: 600, temperature: 0 });
      }
      if (!content) return res.status(502).json({ error: 'AI xizmati javob bermadi' });

      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').replace(/<think>[\s\S]*?<\/think>/gi, '');
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) return res.status(422).json({ error: 'AI javobidan JSON topilmadi' });
      let parsed: any;
      try { parsed = JSON.parse(m[0]); } catch { return res.status(422).json({ error: 'AI javobini o‘qib bo‘lmadi' }); }

      const numOf = (v: any) => { const mm = String(v ?? '').match(/\d+/); return mm ? Number(mm[0]) : null; };
      const rawOpts = parsed.options || parsed.javoblar || [];
      const textLat = String(parsed.textLat || parsed.savol || '').trim().replace(/^\d{1,3}[.)]\s*/, '');
      const validTopicIds = new Set(topics.map((t) => t.id));
      const topicId = numOf(parsed.topicId);
      res.json({
        textLat,
        options: Array.isArray(rawOpts) ? rawOpts.map((x: any) => String(x).trim()).filter(Boolean) : [],
        shablon: numOf(parsed.shablon),
        tartib: numOf(parsed.tartib),
        correctIndex: parsed.correctIndex != null && !isNaN(Number(parsed.correctIndex)) ? Number(parsed.correctIndex) : null,
        izoh: parsed.izoh && String(parsed.izoh).trim() ? String(parsed.izoh).trim() : '',
        topicId: topicId != null && validTopicIds.has(topicId) ? topicId : null,
      });
    } catch (e: any) {
      const msg = e?.name === 'TimeoutError' ? 'AI juda sekin javob berdi (timeout)' : ('AI xatosi: ' + (e?.message || e));
      res.status(502).json({ error: msg });
    }
  })
);

/* ---------- Tarjima (o'zbekcha lotin -> rus) ---------- */
adminRouter.get(
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
      res.json({ text: translated });
    } catch (e: any) {
      res.status(502).json({ error: 'Tarjima xatosi: ' + (e?.message || e), text: '' });
    }
  })
);

/* ---------- AI bilan rasmni qayta bo'yash (Gemini Nano Banana) ---------- */

// O'zbekcha rang nomlari -> inglizcha (Gemini ingliz promptni yaxshiroq tushunadi)
const UZ_COLOR: Record<string, string> = {
  oq: 'white', qora: 'black', qizil: 'red', "ko'k": 'blue', kok: 'blue',
  yashil: 'green', sariq: 'yellow', kulrang: 'gray', jigarrang: 'brown',
  "to'q sariq": 'orange', apelsin: 'orange', binafsha: 'purple',
  pushti: 'pink', kumush: 'silver', kumushrang: 'silver',
  oltin: 'gold', moviy: 'light blue', bej: 'beige',
};
const mapColor = (c: string) => {
  const k = c.trim().toLowerCase();
  return UZ_COLOR[k] || k; // topilmasa o'zini yuboramiz
};

function buildRecolorPrompt(pairs: { object: string; color: string }[]): string {
  const lines = pairs
    .filter((p) => p.object?.trim() && p.color?.trim())
    .map((p) => `- the ${p.object.trim()} must become ${mapColor(p.color)}`)
    .join('\n');
  return [
    'You are a precise photo editor. Edit ONLY the color of the specified objects in this image.',
    'Recolor the following objects:',
    lines,
    '',
    'Strict rules:',
    '- Do NOT change the scene, road, background, road signs, markings, composition, camera angle or any other object.',
    '- Change ONLY the color of the listed objects; keep their shape, texture, shadows and reflections realistic.',
    '- Keep photorealistic lighting; the recolored object must look natural in the scene.',
    '- Output the edited image only. Do not add text, watermarks or borders.',
  ].join('\n');
}

adminRouter.post(
  '/recolor-image',
  upload.single('image'),
  ah(async (req, res) => {
    if (!GEMINI_API_KEY) return res.status(400).json({ error: 'GEMINI_API_KEY sozlanmagan (serverda .env)' });
    if (!req.file) return res.status(400).json({ error: 'Rasm yuklanmadi' });

    let pairs: { object: string; color: string }[] = [];
    try { pairs = JSON.parse(String(req.body.pairs || '[]')); } catch { pairs = []; }
    const promptText = pairs.length > 0 ? buildRecolorPrompt(pairs) : String(req.body.prompt || '').trim();
    if (!promptText) return res.status(400).json({ error: 'Obyekt/rang kiritilmadi' });

    const mime = req.file.mimetype || 'image/jpeg';
    const base64 = req.file.buffer.toString('base64');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

    let r: Awaited<ReturnType<typeof fetch>>;
    try {
      r = await fetch(url, {
        method: 'POST',
        headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: promptText }] }],
        }),
        signal: AbortSignal.timeout(60_000), // rasm generatsiyasi sekin bo'lishi mumkin
      });
    } catch (e: any) {
      const msg = e?.name === 'TimeoutError' ? 'Gemini javob bermadi (timeout)' : 'Tarmoq xatosi: ' + (e?.message || e);
      return res.status(504).json({ error: msg });
    }

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      if (r.status === 429) return res.status(429).json({ error: 'Gemini bepul limiti tugadi, biroz kuting (429)' });
      if (r.status === 400) return res.status(400).json({ error: 'Gemini so‘rovni rad etdi: ' + detail.slice(0, 300) });
      return res.status(502).json({ error: `Gemini xatosi (${r.status})` });
    }

    const data: any = await r.json();
    const cand = data?.candidates?.[0];
    const block = data?.promptFeedback?.blockReason || cand?.finishReason;
    const parts: any[] = cand?.content?.parts || [];

    // Javob camelCase (inlineData); himoya uchun snake_case ham tekshiramiz
    const imgPart = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
    if (!imgPart) {
      const textPart = parts.find((p: any) => typeof p?.text === 'string')?.text;
      const reason =
        block && block !== 'STOP'
          ? `Model rad etdi: ${block}`
          : textPart
          ? 'Model rasm o‘rniga matn qaytardi: ' + String(textPart).slice(0, 200)
          : 'Model rasm qaytarmadi';
      return res.status(502).json({ error: reason });
    }
    const inline = imgPart.inlineData || imgPart.inline_data;
    res.json({ imageBase64: inline.data, mime: inline.mimeType || inline.mime_type || 'image/png' });
  })
);

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
    const shablon = req.query.shablon ? Number(req.query.shablon) : undefined;
    const where: any = {};
    if (q) where.textLat = { contains: q };
    if (topicId) where.topicId = topicId;
    if (shablon) where.shablon = shablon;
    // Cheklov savollar soniga qarab: 300 ta bo'lsa shablonlarning faqat boshi ko'rinib qolardi
    const takeRaw = Number(req.query.take);
    const take = Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(takeRaw, 5000) : 3000;
    const questions = await prisma.question.findMany({
      where,
      include: { options: { orderBy: { order: 'asc' } }, topic: true, ticket: true, category: true },
      orderBy: [{ shablon: 'asc' }, { order: 'asc' }, { id: 'asc' }], // shablon, keyin tartib
      take,
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
    textRus: String(body.textRus || '').trim(),
    shablon: body.shablon !== undefined && body.shablon !== null && body.shablon !== '' ? Number(body.shablon) : null,
    order: body.order !== undefined && body.order !== null && body.order !== '' ? Number(body.order) : 0,
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
            textRus: String(o.textRus || '').trim(),
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
            textRus: String(o.textRus || '').trim(),
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
    // ?v= versiya — rasm almashtirilganda cache eskisini ko'rsatmasin
    const url = `/api/questions/${id}/image?v=${Date.now()}`;
    await prisma.question.update({ where: { id }, data: { imageUrl: url } });
    res.json({ ok: true, imageUrl: url });
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
