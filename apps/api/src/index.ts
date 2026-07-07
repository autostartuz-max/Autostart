import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PORT, DEV_AUTH } from './env';
import { userRouter } from './routes/user';
import { adminRouter } from './routes/admin';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, devAuth: DEV_AUTH }));

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

app.listen(PORT, () => {
  console.log(`✅ YHQ API ishga tushdi: http://localhost:${PORT}  (DEV_AUTH=${DEV_AUTH})`);
  if (fs.existsSync(webDist)) console.log('   Frontend (web + admin) shu serverdan xizmat qilinmoqda.');
});
