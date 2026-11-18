import type { V } from '../asos/geom';

/** Rasmiy mashqlar (3494-son qaror, "B" toifa, 2-bob) */
export type MashqKodi =
  | 'start' | 'piyoda' | 'estakada' | 'burilish90' | 'chorraha' | 'ilon'
  | 'boks' | 'temir' | 'tezlashish' | 'avariya' | 'parallel' | 'finish';

export type BoyoqTuri =
  | 'chet'        // yo'l cheti chizig'i (1.1 oq / mashqlarda 1.4 sariq)
  | 'markaz'      // qarama-qarshi yo'nalishlarni ajratuvchi (1.1)
  | 'stop'        // to'xtash chizig'i (1.12, 0.4 m)
  | 'start'       // START / FINISH chizig'i (0.4 m)
  | 'mashqChegara'// mashq boshlanish/tugash uzuq sariq chizig'i
  | 'nazorat'     // nazorat chizig'i (boks, parkovka)
  | 'zebra'       // piyodalar o'tish joyi (1.14.1)
  | 'strelka'     // yo'nalish strelkasi
  | 'yozuv';

/** Yo'l ustidagi bo'yoq. `xato` — g'ildirak bossa qoidabuzarlik */
export interface Boyoq {
  poly: V[];
  rang: 'oq' | 'sariq';
  tur: BoyoqTuri;
  xato: boolean;
}

export interface Yozuv { matn: string; p: V; th: number; balandlik: number }

/** Yo'l belgisi: kod — 172-son qaror raqami (rasm katalogdan) yoki 'tezlik:20' kabi */
export interface Belgi { kod: string; p: V; th: number; ikkinchi?: string; uchinchi?: string }

/** Svetofor: th — chiroqlar qaragan tomon (yaqinlashayotgan haydovchiga) */
export interface Svetofor { id: string; p: V; th: number }

export interface Estakada {
  /** Ko'tarilish boshlanadigan nuqta (yo'l o'qida) */
  boshi: V;
  th: number;
  /** Qatnov qismi eni (to'siqlar orasi) */
  eni: number;
  /** Qiya qism gorizontal uzunligi, tepa uzunligi */
  qiya: number;
  tepa: number;
  qiyalik: number; // 0.14 = 14%
  balandlik: number;
  /** To'xtash chizig'i: boshlanishdan gorizontal masofa */
  stopS: number;
}

export interface TemirYol { markaz: V; th: number; uzunlik: number; kesishmaEni: number }

export interface PiyodaYoli { a: V; b: V; zebra: V[] }

/** Avariya signal qurilmasi */
export interface AvariyaQurilma { p: V[]; th: number }

/** Marshrutning bir qadami (mashq) */
export interface Qadam {
  kod: MashqKodi;
  nom: string;
  /** Mashina old qismi shu kesmani kesib o'tsa — qadam boshlanadi */
  kirish: [V, V];
  /** Qadam tugaydigan kesma (qanday kesib o'tilishi mashqqa bog'liq) */
  chiqish: [V, V];
  /** Mashina yuradigan yo'lak markazi (avtopilot, xarita, adashishni aniqlash) */
  yol: V[];
  /** Mashq hududi — orqaga yurish va to'xtashga ruxsat, sariq chiziqlar */
  zona?: V[];
  /** Mashqqa xos ma'lumotlar (stop chizig'i, nazorat chizig'i, svetofor...) */
  m: Record<string, any>;
  /** Marshrutning qaysi qismida (yolQismlari indeksi) */
  qism: number;
}

/** Burilishdan oldin ko'rsatkich yoqilishi kerak bo'lgan joy (mashina old qismi kesib o'tganda tekshiriladi) */
export interface SignalNuqta { chiziq: [V, V]; tomon: 'chap' | 'ong'; nom: string }

export interface Maydon {
  /** Asfalt: ko'pburchaklar to'plami, har biri [tashqi, ...teshiklar] */
  asfalt: V[][][];
  /** Asfalt chegaralari (yopiq halqalar): bordyur, to'qnashuv. Asfalt halqaning chap tomonida. */
  chegaralar: V[][];
  boyoqlar: Boyoq[];
  yozuvlar: Yozuv[];
  belgilar: Belgi[];
  svetoforlar: Svetofor[];
  estakadalar: Estakada[];
  temirYollar: TemirYol[];
  piyodaYollari: PiyodaYoli[];
  avariya: AvariyaQurilma[];
  /** Mashq hududlari (sariq chiziqlar uchun) */
  mashqZonalari: V[][];
  marshrut: Qadam[];
  /** Imtihon yo'li (qator markazi): boksgacha va boksdan keyin */
  yolQismlari: V[][];
  signalNuqtalar: SignalNuqta[];
  /** To'xtab turish taqiqlangan joylar (piyodalar o'tish joyi, chorraha, temir yo'l) */
  taqiqZonalar: V[][];
  boshlash: { p: V; th: number };
  ramka: { minX: number; minY: number; maxX: number; maxY: number };
}
