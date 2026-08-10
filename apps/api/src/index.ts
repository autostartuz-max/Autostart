import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PORT, HOST, DEV_AUTH } from './env';
import { userRouter } from './routes/user';
import { adminRouter } from './routes/admin';
import { rateLimit } from './rateLimit';

const app = express();
// nginx reverse-proxy orqasida — haqiqiy foydalanuvchi IP'sini bilish uchun
app.set('trust proxy', 1);
// XAVFSIZLIK: "X-Powered-By: Express" sarlavhasi qaysi texnologiya
// ishlatilayotganini oshkor qiladi — hujumchiga kerakli ma'lumot.
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, devAuth: DEV_AUTH }));

// ---- XAVFSIZLIK: rate limiting ----
// 1) Login/ro'yxatdan o'tish — qattiq (parol taxminlashga qarshi)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Juda ko‘p urinish. 15 daqiqa kuting.' });
app.use('/api/admin/login', authLimiter);
app.use('/api/auth', authLimiter);
// 2) Savol/rasm — ommaviy ko'chirishga qarshi (bitta test ~20 savol/rasm)
app.use('/api/questions', rateLimit({ windowMs: 5 * 60 * 1000, max: 240, message: 'Savol/rasm so‘rovlari cheklandi. Biroz kuting.' }));
// 3) Umumiy chegara — har qanday IP uchun
app.use('/api', rateLimit({ windowMs: 5 * 60 * 1000, max: 1000 }));

app.use('/api', userRouter);
app.use('/api/admin', adminRouter);

// ---- Production: qurilgan frontendlarni xizmat qilish (bitta server) ----
const webDist = path.resolve(__dirname, '../../web/dist');
const adminDist = path.resolve(__dirname, '../../admin/dist');

// Admin panel — /admin ostida
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get('/admin/*', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
}

// Mini App — ildizda
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// Xatoliklarni ushlash
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API xato]', err?.message || err);
  res.status(500).json({ error: err?.message || 'Server xatosi' });
});

app.listen(PORT, HOST, () => {
  console.log(`✅ Autostart API ishga tushdi: http://${HOST}:${PORT}  (DEV_AUTH=${DEV_AUTH})`);
  if (fs.existsSync(webDist)) console.log('   Frontend (web + admin) shu serverdan xizmat qilinmoqda.');
});
