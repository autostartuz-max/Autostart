import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './env';
import { prisma } from './prisma';

export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

/** Telegram initData imzosini HMAC-SHA256 bilan tekshiradi. */
export function verifyTelegramInitData(
  initData: string,
  botToken: string
): { ok: boolean; user?: TgUser } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { ok: false };
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calcHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (calcHash !== hash) return { ok: false };
    const userJson = params.get('user');
    return { ok: true, user: userJson ? (JSON.parse(userJson) as TgUser) : undefined };
  } catch {
    return { ok: false };
  }
}

export function signUserToken(userId: number): string {
  return jwt.sign({ userId, kind: 'user' }, JWT_SECRET, { expiresIn: '30d' });
}

export function signAdminToken(adminId: number, role: string): string {
  return jwt.sign({ adminId, role, kind: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Oxirgi faollikni belgilash — "hozir nechta odam ishlayapti" uchun.
 * Har so'rovda bazaga yozmaymiz: foydalanuvchi uchun daqiqada bir marta yetadi.
 * Xotiradagi jadval bitta jarayon uchun (ilova bitta pm2 jarayoni sifatida ishlaydi).
 */
const oxirgiYozuv = new Map<number, number>();
const YOZUV_ORALIGI = 60 * 1000;

function faollikniBelgila(userId: number) {
  const now = Date.now();
  const oldingi = oxirgiYozuv.get(userId) || 0;
  if (now - oldingi < YOZUV_ORALIGI) return;
  oxirgiYozuv.set(userId, now);
  // Fon rejimida — so'rov javobini kutib turmaydi
  prisma.user
    .update({ where: { id: userId }, data: { lastSeen: new Date() } })
    .catch(() => { /* faollik yozuvi muhim emas, xato bo'lsa e'tiborsiz qoldiramiz */ });
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Token yo‘q' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.kind !== 'user') return res.status(401).json({ error: 'Noto‘g‘ri token' });
    const userId = payload.userId as number;
    (req as any).userId = userId;
    faollikniBelgila(userId);
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz' });
  }
}

/**
 * Rollar:
 *   owner — to'liq huquq: savollar + boshqa foydalanuvchilarga rol tayinlash
 *   admin — faqat savollarni ko'rish/qo'shish/tahrirlash
 *   user  — oddiy talaba, admin bo'limlariga umuman kira olmaydi
 *
 * Ruxsat ikki yo'l bilan olinadi:
 *   1) kind='admin' — eski AdminUser tokeni. Bu zaxira ("break-glass") hisob,
 *      shuning uchun owner darajasidagi huquq beradi.
 *   2) kind='user'  — oddiy foydalanuvchi tokeni; roli bazadan o'qiladi.
 *
 * MUHIM: role tokendan EMAS, HAR SAFAR bazadan o'qiladi. Shunda rol olib
 * tashlanganda eski token darhol kuchini yo'qotadi — 30 kun kutilmaydi.
 */
function checkRole(ruxsat: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Token yo‘q' });

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token yaroqsiz' });
    }

    // Eski AdminUser tokeni — zaxira hisob, owner huquqi
    if (payload.kind === 'admin') {
      (req as any).adminId = payload.adminId as number;
      (req as any).adminRole = 'owner';
      return next();
    }

    if (payload.kind === 'user') {
      const userId = payload.userId as number;
      prisma.user
        .findUnique({ where: { id: userId }, select: { role: true } })
        .then((u) => {
          if (!u || !ruxsat.includes(u.role)) return res.status(403).json({ error: 'Ruxsat yo‘q' });
          (req as any).userId = userId;
          (req as any).adminRole = u.role;
          next();
        })
        .catch(() => res.status(500).json({ error: 'Server xatosi' }));
      return;
    }

    return res.status(401).json({ error: 'Ruxsat yo‘q' });
  };
}

/** Savollar bo'limi — owner ham, admin ham kiradi */
export const requireAdmin = checkRole(['owner', 'admin']);

/** Rollarni tayinlash — FAQAT owner */
export const requireOwner = checkRole(['owner']);
