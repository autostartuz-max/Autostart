/**
 * Yo'lak quruvchi: markaziy chiziq bo'ylab har 0,25 m da namuna — undan asfalt, bordyur, sariq chiziq
 * va to'qnashuv chegaralari yasaladi.
 *
 * Koordinatalar (metr): yer XZ tekisligida. yaw — yo'nalish: oldinga vektor = (sin yaw, cos yaw).
 * yaw oshsa — chapga burilish (+Z ga qarab turganda chap tomon +X). Chap normal = (cos yaw, −sin yaw).
 */

export interface Nuqta { x: number; z: number }
export interface Namuna extends Nuqta { yaw: number; s: number; eni: number }

const QADAM = 0.25;

export class YolQuruvchi {
  namunalar: Namuna[] = [];
  private x: number;
  private z: number;
  private yaw: number;
  private s = 0;
  private eni: number;

  constructor(x: number, z: number, yaw: number, eni: number) {
    this.x = x; this.z = z; this.yaw = yaw; this.eni = eni;
    this.namunalar.push({ x, z, yaw, s: 0, eni });
  }

  get uzunlik() { return this.s; }

  /** To'g'ri bo'lak; eni berilsa — bo'lak davomida shu engacha silliq o'zgaradi */
  togri(uz: number, yangiEni = this.eni) {
    this.yur(uz, 0, yangiEni);
    return this;
  }

  /** Yoy: radius (markaziy chiziq bo'yicha), burchak gradusda, tomon: 1 — chapga, −1 — o'ngga */
  yoy(radius: number, burchakGrad: number, tomon: 1 | -1, yangiEni = this.eni) {
    const uz = radius * (burchakGrad * Math.PI) / 180;
    this.yur(uz, tomon / radius, yangiEni);
    return this;
  }

  private yur(uz: number, egrilik: number, yangiEni: number) {
    const n = Math.max(1, Math.ceil(uz / QADAM));
    const ds = uz / n;
    const eni0 = this.eni;
    for (let i = 1; i <= n; i++) {
      // Burilishni bo'lak o'rtasida qo'llash — yoy aniqroq chiqadi
      this.yaw += (egrilik * ds) / 2;
      this.x += Math.sin(this.yaw) * ds;
      this.z += Math.cos(this.yaw) * ds;
      this.yaw += (egrilik * ds) / 2;
      this.s += ds;
      const t = i / n;
      const eni = eni0 + (yangiEni - eni0) * (t * t * (3 - 2 * t));
      this.namunalar.push({ x: this.x, z: this.z, yaw: this.yaw, s: this.s, eni });
    }
    this.eni = yangiEni;
  }
}

/** Markaziy chiziqdan yon tomonga siljigan chiziq: d > 0 — chap, d < 0 — o'ng (d — funksiya: eniga qarab) */
export function siljigan(namunalar: Namuna[], d: (n: Namuna) => number): Nuqta[] {
  return namunalar.map((n) => {
    const k = d(n);
    return { x: n.x + Math.cos(n.yaw) * k, z: n.z - Math.sin(n.yaw) * k };
  });
}

/** Nuqtaga eng yaqin namuna (oldingi indeks atrofidan qidiriladi — tez) */
export function engYaqin(namunalar: Namuna[], p: Nuqta, taxmin: number): number {
  let eng = taxmin;
  let engM = Infinity;
  const a = Math.max(0, taxmin - 60);
  const b = Math.min(namunalar.length - 1, taxmin + 60);
  for (let i = a; i <= b; i++) {
    const n = namunalar[i];
    const m = (n.x - p.x) ** 2 + (n.z - p.z) ** 2;
    if (m < engM) { engM = m; eng = i; }
  }
  // Uzoqlashib ketgan bo'lsa (qayta boshlash va h.k.) — butun yo'l bo'ylab
  if (engM > 9) {
    for (let i = 0; i < namunalar.length; i++) {
      const n = namunalar[i];
      const m = (n.x - p.x) ** 2 + (n.z - p.z) ** 2;
      if (m < engM) { engM = m; eng = i; }
    }
  }
  return eng;
}

/** Nuqtaning markaziy chiziqqa nisbatan yon siljishi (chap +, o'ng −) */
export function yonSiljish(n: Namuna, p: Nuqta): number {
  return (p.x - n.x) * Math.cos(n.yaw) - (p.z - n.z) * Math.sin(n.yaw);
}

/* ---------------------------------------------------------------------------------------------- */

/** Birinchi bosqich mashqi: START → "Ilon izi" → FINISH. Chizmalardagi o'lchamlar (B toifa). */
export interface Maydon {
  namunalar: Namuna[];
  /** Mashq chegaralari (markaziy chiziq bo'yicha masofa, m) */
  s: { start: number; belgi20: number; startOxiri: number; ilonBosh: number; ilonOxir: number; finish: number; toxtashOxir: number; oxir: number };
  /** Mashinaning boshlang'ich joyi (orqa o'q markazi) */
  boshlash: { x: number; z: number; yaw: number };
}

// Ilon izi: tashqi radius 7,65 m, ikki 135° yoy (3494-son qaror, 2-ilova, 5-mashq "B").
// Yo'lak eni chizmada "2÷2,5B" (B — mashina eni): 2,25 × 1,735 ≈ 3,9 m.
const ILON_ENI = 3.9;
const ILON_TASHQI_R = 7.65;
const START_ENI = 3.5; // kamida 3 m (qaror, 6-band)

export function maydonQur(): Maydon {
  const q = new YolQuruvchi(0, 0, 0, START_ENI);
  q.togri(6); // startdan oldingi joy — mashina shu yerda turadi
  const start = q.uzunlik;
  q.togri(10); // 1-mashq "START" maydoni: 10 m, 20 km/soat belgisi 10-metrda
  const startOxiri = q.uzunlik;
  q.togri(6, ILON_ENI); // ilon iziga o'tish, yo'lak kengayadi
  const ilonBosh = q.uzunlik;
  const rc = ILON_TASHQI_R - ILON_ENI / 2; // markaziy chiziq radiusi
  q.yoy(rc, 135, 1).yoy(rc, 135, -1);
  const ilonOxir = q.uzunlik;
  q.togri(6, START_ENI);
  const finish = q.uzunlik + 2;
  q.togri(2 + 10); // finish chizig'i va 10 m to'xtash maydoni (qaror, 23-band)
  const toxtashOxir = q.uzunlik;
  q.togri(2);
  const oxir = q.uzunlik;

  const n0 = q.namunalar[0];
  // Mashina old bamperi START chizig'idan 0,5 m orqada turadi
  const orqaOqS = start - 0.5 - 2.62 - 0.95;
  const p = q.namunalar[Math.round(orqaOqS / QADAM)] || n0;
  return {
    namunalar: q.namunalar,
    s: { start, belgi20: start + 10, startOxiri, ilonBosh, ilonOxir, finish, toxtashOxir, oxir },
    boshlash: { x: p.x, z: p.z, yaw: p.yaw },
  };
}
