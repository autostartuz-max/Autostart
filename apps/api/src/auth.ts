import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './env';

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
  return jwt.sign({ adminId, role, kind: 'admin' }, JWT_SECRET, { expiresIn: '2d' });
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Token yo‘q' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.kind !== 'user') return res.status(401).json({ error: 'Noto‘g‘ri token' });
    (req as any).userId = payload.userId as number;
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Token yo‘q' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.kind !== 'admin') return res.status(401).json({ error: 'Admin emas' });
    (req as any).adminId = payload.adminId as number;
    (req as any).adminRole = payload.role as string;
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz' });
  }
}
