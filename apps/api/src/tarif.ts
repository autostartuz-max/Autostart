import crypto from 'crypto';
import { prisma } from './prisma';
import { JWT_SECRET } from './env';
import { keshla } from './kesh';

/**
 * Tariflar (2026-11 hujjat bo'yicha). To'lov hozircha qo'lda: foydalanuvchi so'rov qoldiradi,
 * admin to'lovni qabul qilib tarifni yoqadi. Daraja: 0 — tarifsiz, 1 — Standart, 2 — Silver, 3 — Premium.
 */
export type TarifKod = 'standart' | 'silver' | 'premium';
export type Imkoniyat = 'audio' | 'belgilar' | 'video' | 'mavzu' | 'avtodrom';

/**
 * narx — OYLIK narx (so'm). Tarif oy oylik: jami = narx × oy (2026-11-24, foydalanuvchi: "1 oy uchun 59 000,
 * 3 oyda 3 ga ko'paytiriladi"): Standart 3 × 59 000 = 177 000, Silver 3 × 99 000 = 297 000, Premium 6 × 119 000 = 714 000.
 */
export const TARIFLAR: { kod: TarifKod; nom: string; narx: number; oy: number; daraja: number; imkoniyatlar: string[] }[] = [
  {
    kod: 'standart', nom: 'Standart', narx: 59000, oy: 3, daraja: 1,
    imkoniyatlar: [
      'Har bir testga Autostart mutaxassislari tayyorlagan audio sharh',
      'Yo‘l belgilari va ularni qulay qidiruv orqali ma’lumotlardan, sharhlardan foydalanish',
      'Ushbu tarifdan 3 oy muddatgacha foydalanish',
    ],
  },
  {
    kod: 'silver', nom: 'Silver', narx: 99000, oy: 3, daraja: 2,
    imkoniyatlar: [
      'Har bir testga Autostart mutaxassislari tayyorlagan audio sharh',
      'Yo‘l belgilari va ularni qulay qidiruv orqali ma’lumotlardan, sharhlardan foydalanish',
      'Autostart tajribali ustozlari tomonidan har bir testga yozilgan video darslar',
      'Ushbu tarifdan 3 oy muddatgacha foydalanish',
    ],
  },
  {
    kod: 'premium', nom: 'Premium', narx: 119000, oy: 6, daraja: 3,
    imkoniyatlar: [
      'Har bir testga Autostart mutaxassislari tayyorlagan audio sharh',
      'Yo‘l belgilari va ularni qulay qidiruv orqali ma’lumotlardan, sharhlardan foydalanish',
      'Autostart tajribali ustozlari tomonidan har bir testga yozilgan video darslar',
      'Ustozlarimiz zarur mavzularga tayyorlagan video darslar (tez orada)',
      'Autostart avtodromida mutaxassislar tomonidan tayyorlangan A, B, BC, D, CE toifalar uchun imtihon amaliy mashg‘ulotlari',
      'Ushbu tarifdan 6 oy muddatgacha foydalanish',
    ],
  },
];

/** Har bir imkoniyat qaysi tarif darajasidan ochiladi */
export const IMKONIYAT_DARAJA: Record<Imkoniyat, number> = { audio: 1, belgilar: 1, video: 2, mavzu: 3, avtodrom: 3 };

export const tarifTop = (kod: string) => TARIFLAR.find((t) => t.kod === kod) || null;

/** Tarifning jami narxi (oylik narx × oylar soni) */
export const jamiNarx = (t: { narx: number; oy: number }, oy = t.oy) => t.narx * oy;

/** To'lov uchun aloqa (Aloqa sahifasidagi call-markaz) */
export const TOLOV_KONTAKT = { telefon: '78 555 07 17', tel: '+998785550717' };

/** Foydalanuvchining hozirgi faol tarifi (eng yuqori daraja) */
export async function joriyTarif(userId: number) {
  const r = await prisma.obuna.findMany({ where: { userId, tugaydi: { gt: new Date() } }, select: { tarif: true, tugaydi: true } });
  let eng: { kod: TarifKod; nom: string; daraja: number; tugaydi: Date } | null = null;
  for (const o of r) {
    const t = tarifTop(o.tarif);
    if (!t) continue;
    if (!eng || t.daraja > eng.daraja || (t.daraja === eng.daraja && o.tugaydi > eng.tugaydi)) eng = { kod: t.kod, nom: t.nom, daraja: t.daraja, tugaydi: o.tugaydi };
  }
  return eng;
}

/** Xodimlar (owner/admin) hammasini ko'radi */
export async function tarifDarajasi(userId: number): Promise<{ daraja: number; joriy: Awaited<ReturnType<typeof joriyTarif>> }> {
  const [u, joriy] = await Promise.all([prisma.user.findUnique({ where: { id: userId }, select: { role: true } }), joriyTarif(userId)]);
  const xodim = u?.role === 'owner' || u?.role === 'admin';
  return { daraja: xodim ? 3 : joriy?.daraja ?? 0, joriy };
}

/* ── Media kaliti: <audio>/<video> sarlavha yubora olmaydi, shuning uchun manzilga ?k= qo'shiladi.
   Kalitda foydalanuvchi va tarif darajasi imzolangan, 24 soat amal qiladi. */
const imzo = (s: string) => crypto.createHmac('sha256', JWT_SECRET).update('media:' + s).digest('base64url').slice(0, 22);

export function mediaKalit(userId: number, daraja: number) {
  const tugash = Math.floor(Date.now() / 1000) + 24 * 3600;
  const asos = `${userId}.${daraja}.${tugash}`;
  return `${asos}.${imzo(asos)}`;
}

/** Kalitdan ruxsat darajasi (yaroqsiz yoki muddati o'tgan — 0) */
export function kalitDarajasi(k: unknown): number {
  if (typeof k !== 'string') return 0;
  const q = k.split('.');
  if (q.length !== 4) return 0;
  const asos = q.slice(0, 3).join('.');
  const kut = imzo(asos);
  if (q[3].length !== kut.length || !crypto.timingSafeEqual(Buffer.from(q[3]), Buffer.from(kut))) return 0;
  if (Number(q[2]) * 1000 < Date.now()) return 0;
  return Math.max(0, Math.min(3, Number(q[1]) || 0));
}

/* ── Ilova matnlari (admin tahrirlaydi) ── */
export interface Bayram { sana: string; nom: string; matn: string }
export interface IlovaMatnlar {
  bayramlar: Bayram[];
  eslatmalar: { matn: string; taqiq?: boolean }[];
  reklama: string;
  otkazish: string;
}

export const STANDART_MATNLAR: IlovaMatnlar = {
  // sana: "MM-DD" (har yili) yoki "YYYY-MM-DD" (hayitlar — sanasi har yili o'zgaradi, admin kiritadi)
  bayramlar: [
    { sana: '01-01', nom: 'Yangi yil', matn: 'Autostart jamoasi sizni Yangi yil bilan chin qalbdan tabriklaydi! Yangi yilda guvohnomangizni qo‘lga kiritishingizni tilaymiz.' },
    { sana: '01-14', nom: 'Vatan himoyachilari kuni', matn: 'Vatan himoyachilari kuni muborak! Autostart jamoasi sizga tinchlik, sog‘lik va yo‘llarda omad tilaydi.' },
    { sana: '03-08', nom: 'Xalqaro xotin-qizlar kuni', matn: 'Aziz opa-singillar, 8-mart bayramingiz muborak! Autostart jamoasi sizga baxt, sog‘lik va xavfsiz yo‘llar tilaydi.' },
    { sana: '03-21', nom: 'Navro‘z bayrami', matn: 'Navro‘z bayrami muborak! Bahor kabi yangilanish, maqsadlaringizga erishishingizni tilaymiz. Autostart jamoasi.' },
    { sana: '05-09', nom: 'Xotira va qadrlash kuni', matn: 'Xotira va qadrlash kuni. Ota-bobolarimiz xotirasi oldida bosh egamiz. Autostart jamoasi.' },
    { sana: '09-01', nom: 'Mustaqillik kuni', matn: 'Mustaqillik bayramingiz muborak! Autostart jamoasi sizga yorug‘ kelajak va omad tilaydi.' },
    { sana: '10-01', nom: 'O‘qituvchi va murabbiylar kuni', matn: 'Ustozlar bayrami muborak! Barcha ustozlarimizga, jumladan Autostart ustozlariga minnatdorchilik bildiramiz.' },
    { sana: '12-08', nom: 'Konstitutsiya kuni', matn: 'Konstitutsiya kuni muborak! Qonunlarga, jumladan yo‘l harakati qoidalariga amal qilaylik. Autostart jamoasi.' },
  ],
  eslatmalar: [
    { matn: 'Hurmatli foydalanuvchi! Yo‘l harakati qoidalarini o‘rganmasdan va haydovchilik guvohnomasiga ega bo‘lmasdan rulga aslo o‘tirmang!', taqiq: true },
    { matn: 'Piyoda yurganda yo‘lning belgilangan qismidan (piyodalar yo‘lakchasidan) o‘ting.' },
    { matn: 'Avtomashinadan chiqindi uloqtirmang! Bu eng madaniyatsizlik belgisi. Chiqindilarni mashinada yig‘ib, belgilangan joyga tashlang.' },
    { matn: 'Jamoat transportida o‘zingizdan kattalar va ayollarga joy bering.' },
    { matn: 'Farzandingiz yoki 14 yoshgacha ukangizni avtomobilning old o‘rindig‘iga o‘tkazmang.' },
    { matn: 'Agar haydovchi bo‘lsangiz, yo‘llarda belgilangan tezlikka amal qiling.' },
  ],
  // {tarif} — har kuni almashadi (Standart, Silver, Premium)
  reklama: 'Hurmatli obunachi! Bizda 1000 ga yaqin foydalanuvchilar {tarif} tarifini sotib olib, natijalarga tez erishib haydovchi bo‘lishdi.',
  // {kun} — "bir", "ikki" ... "o‘n" (10 dan ko'p bo'lsa — raqam)
  otkazish: 'Siz {kun} kun o‘tkazib yubordingiz. Eslab qoling: natijaga erishish uchun har kunlik bardavomlik zarur.',
};

/** Admin sozlamasini standart bilan birlashtirish */
export function matnlarBirlashtir(s: any): IlovaMatnlar {
  const st = STANDART_MATNLAR;
  if (!s || typeof s !== 'object') return st;
  const matn = (x: any, d: string) => (typeof x === 'string' && x.trim() ? x.slice(0, 600) : d);
  return {
    bayramlar: Array.isArray(s.bayramlar)
      ? s.bayramlar.filter((b: any) => typeof b?.sana === 'string' && /^(\d{4}-)?\d{2}-\d{2}$/.test(b.sana) && typeof b?.matn === 'string' && b.matn.trim())
        .slice(0, 40).map((b: any) => ({ sana: b.sana, nom: String(b.nom || '').slice(0, 80), matn: b.matn.slice(0, 600) }))
      : st.bayramlar,
    eslatmalar: Array.isArray(s.eslatmalar)
      ? s.eslatmalar.filter((e: any) => typeof e?.matn === 'string' && e.matn.trim()).slice(0, 40).map((e: any) => ({ matn: e.matn.slice(0, 400), taqiq: !!e.taqiq }))
      : st.eslatmalar,
    reklama: matn(s.reklama, st.reklama),
    otkazish: matn(s.otkazish, st.otkazish),
  };
}

export const ilovaMatnlari = keshla(60_000, async () => {
  const r = await prisma.ilovaSozlama.findUnique({ where: { id: 1 } });
  return matnlarBirlashtir(r?.data);
});
