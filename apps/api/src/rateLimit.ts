import { Request, Response, NextFunction } from 'express';

/**
 * Oddiy, bog'liqliksiz rate limiter (IP bo'yicha, fikslangan oyna).
 * Parol taxminlash va ommaviy ma'lumot ko'chirishга qarshi.
 * Bitta jarayonda ishlaydi (bu ilova bitta PM2 jarayoni sifatida ishlaydi).
 */
export function rateLimit(opts: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; reset: number }>();

  // eskirgan yozuvlarni tozalab turamiz (xotira o'smasligi uchun)
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, opts.windowMs);
  if (typeof (timer as any).unref === 'function') (timer as any).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // nginx orqasida haqiqiy IP — X-Forwarded-For'ning birinchisi
    const fwd = (req.headers['x-forwarded-for'] as string) || '';
    const ip = (fwd.split(',')[0] || '').trim() || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    let b = hits.get(ip);
    if (!b || b.reset < now) {
      b = { count: 0, reset: now + opts.windowMs };
      hits.set(ip, b);
    }
    b.count++;

    if (b.count > opts.max) {
      const retry = Math.max(1, Math.ceil((b.reset - now) / 1000));
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ error: opts.message || 'Juda ko‘p so‘rov. Biroz kuting.' });
    }
    next();
  };
}
