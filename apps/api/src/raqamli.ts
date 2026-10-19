import { prisma } from './prisma';

/**
 * "Raqamli savollar" — javobi son bo'lgan savollar ("50 km/s", "16 yosh",
 * "0,8 mm"). Admin qo'yadigan `isNumeric` belgisi hech bir savolga qo'yilmagan
 * edi va bo'lim doim bo'sh ochilardi — shuning uchun javob variantlaridan
 * avtomatik aniqlanadi. Rasm raqamlari ("1 / 2 / 3", "1 va 3", "1,2") va
 * toifa nomlari ("M1", "N2") raqamli hisoblanmaydi.
 */
const BIRLIK =
  /^(km\/s(oat)?|km\/h|km|m\b|metr|sm\b|mm\b|kg|t\b|tonna|soat|daqiqa|minut|sekund|soniya|kun|oy\b|yil|%|foiz|marta|ta\b|nafar|kishi|litr|l\b|yosh|gradus|°|‰|promill|mg|kvt|kw|ot\s*kuchi|o.rin)/i;
const SON = /^(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|—|dan|gacha|va|,)\s*\d+(?:[.,]\d+)?)*\s*(.*)$/;
// Savol son so'rayapti ("nechta qatnov qismi?") — bunda oddiy "1 / 2 / 4" ham qiymat
const SANOQ = /\b(necha|nechta|qancha)/i;

function qiymatmi(matn: string | null, sanoq: boolean) {
  const s = String(matn || '').trim().replace(/[‘’`ʻʼ]/g, "'");
  const m = s.match(SON);
  if (!m) return false;
  const qolgan = m[2];
  if (BIRLIK.test(qolgan)) return true;
  if (qolgan !== '') return false;
  // Birliksiz son: savol sanoq so'rasa — har qanday butun son; aks holda faqat
  // 10 dan katta butun son (rasm raqamlari 1..9, "1,2" esa 1- va 2-rasm)
  if (!/^\d+$/.test(m[1])) return false;
  return sanoq || Number(m[1]) >= 10;
}

export function raqamlimi(q: { textLat: string | null; options: { textLat: string | null; isCorrect: boolean }[] }) {
  const sanoq = SANOQ.test(q.textLat || '');
  const qiymatli = q.options.filter((o) => qiymatmi(o.textLat, sanoq));
  if (qiymatli.length < 2) return false;
  const togri = q.options.find((o) => o.isCorrect);
  return qiymatli.length >= 3 || (!!togri && qiymatmi(togri.textLat, sanoq));
}

// Savollar kam o'zgaradi — ro'yxat 5 daqiqa eslab qolinadi
let kesh: { vaqt: number; idlar: number[] } | null = null;

/** Raqamli savollar id'lari: admin belgilagani + avtomatik aniqlangani */
export async function raqamliSavolIdlari() {
  if (kesh && Date.now() - kesh.vaqt < 5 * 60_000) return kesh.idlar;
  const savollar = await prisma.question.findMany({
    where: { status: 'published' },
    select: { id: true, isNumeric: true, textLat: true, options: { select: { textLat: true, isCorrect: true } } },
  });
  const idlar = savollar.filter((q) => q.isNumeric || raqamlimi(q)).map((q) => q.id);
  kesh = { vaqt: Date.now(), idlar };
  return idlar;
}
