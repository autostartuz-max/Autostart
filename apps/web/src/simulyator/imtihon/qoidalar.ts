import type { MashqKodi } from '../dunyo/turlar';

/** Qoidabuzarlik turlari */
export type JarimaKodi =
  | 'kamar' | 'chiroq' | 'tezlik' | 'chiziq' | 'bordyur' | 'qizil' | 'stopChiziq' | 'stopBelgi' | 'piyoda'
  | 'orqagaSirpanish' | 'toxtamadi' | 'noqonuniyToxtash' | 'dvigatel' | 'uzatma' | 'qolTormoz' | 'orqaga'
  | 'vaqt' | 'mashq' | 'yonalish' | 'avariyaChiroq';

export interface JarimaTuri {
  nom: string;
  /** Standart ball — TAXMINIY (rasmiy jadval e'lon qilinmagan), admin o'zgartiradi */
  ball: number;
  tavsif: string;
  /** Imtihonni darhol to'xtatadi */
  yakunlovchi?: boolean;
}

export const JARIMA_TURLARI: Record<JarimaKodi, JarimaTuri> = {
  kamar: { nom: 'Xavfsizlik kamari taqilmagan', ball: 20, tavsif: 'Harakat boshlanganda yoki harakat davomida kamar taqilmagan' },
  chiroq: { nom: 'Burilish chirog‘i yoqilmagan', ball: 10, tavsif: 'Harakatni boshlash, burilish va to‘xtash joyidan chiqishda ko‘rsatkich yoqilmagan' },
  tezlik: { nom: 'Tezlik chegarasidan oshish', ball: 10, tavsif: 'Avtodromda 20 km/soat (tezlashish bo‘lagida 40 km/soat), o‘lchov xatosi +5 km/soat' },
  chiziq: { nom: 'Yo‘l chizig‘ini bosish', ball: 10, tavsif: 'G‘ildirak chet (1.1, 1.4) yoki markaziy chiziqni bosdi' },
  bordyur: { nom: 'Bordyur yoki to‘siqqa tegish', ball: 20, tavsif: 'Avtomobil bordyur, to‘siq yoki boshqa jismga tegdi' },
  qizil: { nom: 'Svetoforning taqiqlovchi ishorasida o‘tish', ball: 100, tavsif: 'Qizil (yoki uzoq yongan sariq) ishorada chorrahaga kirildi' },
  stopChiziq: { nom: 'Stop chizig‘idan o‘tib ketish', ball: 10, tavsif: 'To‘xtash kerak bo‘lganda old qism to‘xtash chizig‘idan o‘tib ketdi' },
  stopBelgi: { nom: 'STOP belgisida to‘xtamaslik', ball: 20, tavsif: '2.5 "Harakatlanish to‘xtamasdan taqiqlanadi" belgisi oldida to‘liq to‘xtalmadi' },
  piyoda: { nom: 'Piyodaga yo‘l bermaslik', ball: 100, tavsif: 'Piyoda o‘tayotganda o‘tish joyiga kirildi' },
  orqagaSirpanish: { nom: 'Estakadada orqaga sirpanish', ball: 20, tavsif: 'Ko‘tarilishda to‘xtab, qayta harakatlanganda belgilangan masofadan ortiq orqaga ketdi' },
  toxtamadi: { nom: 'Belgilangan joyda to‘xtamaslik', ball: 10, tavsif: 'To‘xtash chizig‘i oldida to‘xtalmadi (estakada)' },
  noqonuniyToxtash: { nom: 'Ruxsat etilmagan joyda to‘xtash', ball: 5, tavsif: 'Sababsiz, belgilanmagan joyda uzoq to‘xtab turildi' },
  dvigatel: { nom: 'Dvigatel o‘chib qoldi', ball: 10, tavsif: 'Noto‘g‘ri boshqaruv tufayli dvigatel o‘chib qoldi' },
  uzatma: { nom: 'Noto‘g‘ri uzatmada harakatlanish', ball: 10, tavsif: 'Harakat yo‘nalishiga teskari uzatma qo‘shildi' },
  qolTormoz: { nom: 'Qo‘l tormozi tortilgan holda harakatlanish', ball: 10, tavsif: 'Qo‘l tormozi tushirilmasdan harakatlanildi' },
  orqaga: { nom: 'Ruxsat etilmagan joyda orqaga harakatlanish', ball: 10, tavsif: 'Boks va parkovkadan tashqarida orqaga yurildi' },
  vaqt: { nom: 'Belgilangan vaqtdan oshib ketish', ball: 20, tavsif: 'Mashq yoki imtihon uchun ajratilgan vaqt tugadi' },
  mashq: { nom: 'Mashqni noto‘g‘ri bajarish', ball: 20, tavsif: 'Mashq talablari bajarilmadi' },
  yonalish: { nom: 'Belgilangan yo‘nalishdan chiqish', ball: 100, tavsif: 'Imtihon marshrutidan chiqib ketildi', yakunlovchi: true },
  avariyaChiroq: { nom: 'Avariya chirog‘ini yoqmaslik', ball: 10, tavsif: 'Avariya holatda to‘xtagandan keyin avariya chirog‘i yoqilmadi' },
};

export const JARIMA_KODLARI = Object.keys(JARIMA_TURLARI) as JarimaKodi[];

/** Mashqlar nomi (3494-son qaror) */
export const MASHQ_NOMI: Record<MashqKodi, string> = {
  start: 'Harakatni boshlash (Start)',
  piyoda: 'Piyodalar o‘tish joyi',
  estakada: 'To‘xtash va tik balandlikka ko‘tarilish (Estakada)',
  burilish90: '90 gradus burchak ostida burilishlar',
  chorraha: 'Harakat tartibga solingan chorraha',
  ilon: 'Ilon izi',
  boks: 'Tor joyda qayrilib olish uchun boksga kirish',
  temir: 'Tartibga solinmagan temir yo‘l kesishmasi',
  tezlashish: 'Tezlashish bo‘lagi',
  avariya: 'Avariya holatda to‘xtash',
  parallel: 'Orqaga harakatlanib parallel to‘xtash (parkovka)',
  finish: 'Harakatni yakunlash (Finish)',
};

export const MASHQ_KODLARI: MashqKodi[] = ['start', 'piyoda', 'estakada', 'burilish90', 'chorraha', 'ilon', 'boks', 'temir', 'tezlashish', 'avariya', 'parallel', 'finish'];

/** Imtihon sozlamalari (admin o'zgartiradi). Rasmiy manbalarda aniqlangan qiymatlar izohda ko'rsatilgan. */
export interface ImtihonSozlama {
  jarimalar: Record<JarimaKodi, { ball: number; faol: boolean }>;
  /** Jarima ballari shu qiymatga yetsa — imtihondan o'tilmadi */
  otishChegarasi: number;
  /** Umumiy imtihon vaqti, daqiqa */
  vaqtDaqiqa: number;
  /** Har bir mashq: faolmi va ajratilgan vaqt (soniya) */
  mashqlar: Record<MashqKodi, { faol: boolean; vaqt: number }>;
  /** Tezlik: 20 km/soat, tezlashish bo'lagida 40 va eng kami 20; o'lchov xatosi 5 km/soat (Toshkent imtihon markazi) */
  tezlik: { asosiy: number; tezlashish: number; engKam: number; xato: number };
  /** Estakada qiyaligi (qaror: 10–16%) */
  qiyalik: number;
  /** Estakadada ruxsat etilgan orqaga sirpanish, m (taxminiy) */
  sirpanish: number;
  /** Shuncha soniya sababsiz turish — ruxsat etilmagan to'xtash (taxminiy) */
  toxtashSoniya: number;
  /** Piyoda chiqishi va chorrahada qizil ishora ehtimoli (0..1) */
  piyodaEhtimol: number;
  qizilEhtimol: number;
  /** Avariya holatda to'xtagach avariya chirog'ini yoqish talab qilinadimi */
  avariyaChiroqKerak: boolean;
  /** Menyuda ko'rinadigan avtomobillar (id → faol) */
  mashinalar: Record<string, boolean>;
  /** Jarima jadvali rasmiy manbaga asoslanganmi (admin belgilaydi) — aks holda "taxminiy" deb ko'rsatiladi */
  rasmiy: boolean;
}

export const STANDART_SOZLAMA: ImtihonSozlama = {
  jarimalar: Object.fromEntries(JARIMA_KODLARI.map((k) => [k, { ball: JARIMA_TURLARI[k].ball, faol: true }])) as ImtihonSozlama['jarimalar'],
  otishChegarasi: 100,
  vaqtDaqiqa: 25,
  mashqlar: {
    start: { faol: true, vaqt: 120 }, piyoda: { faol: true, vaqt: 120 }, estakada: { faol: true, vaqt: 150 },
    burilish90: { faol: true, vaqt: 150 }, chorraha: { faol: true, vaqt: 150 }, ilon: { faol: true, vaqt: 150 },
    boks: { faol: true, vaqt: 240 }, temir: { faol: true, vaqt: 120 }, tezlashish: { faol: true, vaqt: 120 },
    avariya: { faol: true, vaqt: 120 }, parallel: { faol: true, vaqt: 240 }, finish: { faol: true, vaqt: 120 },
  },
  tezlik: { asosiy: 20, tezlashish: 40, engKam: 20, xato: 5 },
  qiyalik: 0.14,
  sirpanish: 0.3,
  toxtashSoniya: 8,
  piyodaEhtimol: 0.7,
  qizilEhtimol: 0.5,
  avariyaChiroqKerak: true,
  mashinalar: { cobalt: true, gentra: true },
  rasmiy: false,
};

/** Serverdan kelgan (qisman) sozlamani standart bilan birlashtirish — noto'g'ri qiymatlar e'tiborsiz */
export function sozlamaBirlashtir(s?: any): ImtihonSozlama {
  const st = STANDART_SOZLAMA;
  if (!s || typeof s !== 'object') return structuredClone(st);
  const son = (x: any, d: number, min: number, max: number) => (typeof x === 'number' && isFinite(x) ? Math.min(max, Math.max(min, x)) : d);
  const out = structuredClone(st);
  for (const k of JARIMA_KODLARI) {
    const j = s.jarimalar?.[k];
    if (j) out.jarimalar[k] = { ball: son(j.ball, st.jarimalar[k].ball, 0, 1000), faol: j.faol !== false };
  }
  for (const k of MASHQ_KODLARI) {
    const m = s.mashqlar?.[k];
    if (m) out.mashqlar[k] = { faol: m.faol !== false, vaqt: son(m.vaqt, st.mashqlar[k].vaqt, 20, 1800) };
  }
  out.otishChegarasi = son(s.otishChegarasi, st.otishChegarasi, 1, 1000);
  out.vaqtDaqiqa = son(s.vaqtDaqiqa, st.vaqtDaqiqa, 3, 120);
  if (s.tezlik) out.tezlik = {
    asosiy: son(s.tezlik.asosiy, st.tezlik.asosiy, 5, 60), tezlashish: son(s.tezlik.tezlashish, st.tezlik.tezlashish, 10, 90),
    engKam: son(s.tezlik.engKam, st.tezlik.engKam, 0, 60), xato: son(s.tezlik.xato, st.tezlik.xato, 0, 20),
  };
  out.qiyalik = son(s.qiyalik, st.qiyalik, 0.1, 0.16);
  out.sirpanish = son(s.sirpanish, st.sirpanish, 0.05, 2);
  out.toxtashSoniya = son(s.toxtashSoniya, st.toxtashSoniya, 2, 120);
  out.piyodaEhtimol = son(s.piyodaEhtimol, st.piyodaEhtimol, 0, 1);
  out.qizilEhtimol = son(s.qizilEhtimol, st.qizilEhtimol, 0, 1);
  if (typeof s.avariyaChiroqKerak === 'boolean') out.avariyaChiroqKerak = s.avariyaChiroqKerak;
  if (s.mashinalar && typeof s.mashinalar === 'object') for (const [k, v] of Object.entries(s.mashinalar)) out.mashinalar[k] = v !== false;
  if (!Object.values(out.mashinalar).some(Boolean)) out.mashinalar.cobalt = true; // hech bo'lmasa bittasi
  out.rasmiy = s.rasmiy === true;
  return out;
}
