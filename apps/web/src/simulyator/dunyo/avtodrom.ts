import {
  type V, v, GRAD, lokal, yoyNuqtalari, yumaloqBurchak, chiziqUzunligi, chiziqdaNuqta, proyeksiya, chegara,
} from '../asos/geom';
import { Yol, yolBant, yoyBantAniq, quti, uzuqChiziq, yaxlitChiziq, tozala } from './quruvchi';
import { birlashtir, chegaralar as chegaralarOl, chetChiziqlari } from './birlashtir';
import { MASHQ_NOMI } from '../imtihon/qoidalar';
import type { Boyoq, Belgi, Maydon, Qadam, Svetofor, Yozuv, Estakada, TemirYol, PiyodaYoli, AvariyaQurilma, MashqKodi, SignalNuqta } from './turlar';

/** Avtodrom o'lchamlari formulalarida ishlatiladigan avtomobil o'lchamlari (3494-son qaror: B, D, K, S) */
export interface AvtodromParam {
  /** Gabarit eni (B), uzunligi (D), old koleya (K), orqa o'qdan orqa gabaritgacha (S) — metr */
  B: number; D: number; K: number; S: number;
  /** Estakada qiyaligi (0.10 — 0.16) */
  qiyalik: number;
}

const PI = Math.PI;
const WR = 4.0;          // halqa yo'li (bir yo'nalish) eni, m (qaror: >= 3 m)
const WA = 7.0;          // chorraha tarmog'i (2 qator) eni
const Q = WA / 4;        // qator markazi (1.75)
const RJ = 6;            // tarmoqdan halqaga burilish radiusi (qator markazi)
// Ikki qatorli tarmoqning uzoq qatoriga chapga burilish: R=6 da old-o'ng burchak bordyurga 1 sm qoladi — 8 m
const RK = 8;
const ICH = 0.25;        // chet chizig'i bordyurdan ichkarida
const r2 = (x: number) => Math.round(x * 100) / 100;

export { MASHQ_NOMI };

export function avtodromQur(prm: AvtodromParam): Maydon {
  const { B, D } = prm;
  const bolaklar: V[][] = [];
  const boyoqlar: Boyoq[] = [];
  const yozuvlar: Yozuv[] = [];
  const belgilar: Belgi[] = [];
  const svetoforlar: Svetofor[] = [];
  const mashqZonalari: V[][] = [];
  const estakadalar: Estakada[] = [];
  const temirYollar: TemirYol[] = [];
  const piyodaYollari: PiyodaYoli[] = [];
  const avariya: AvariyaQurilma[] = [];

  const qut = (x0: number, y0: number, x1: number, y1: number) => { const q = quti(x0, y0, x1, y1); bolaklar.push(q); return q; };
  const yoyBant = (m: V, r: number, a0: number, burilish: number, eni = WR) => bolaklar.push(yoyBantAniq(m, r, a0, burilish, eni));
  const yumaloq = (c: V, u1: V, u2: V, r: number) => bolaklar.push(yumaloqBurchak(c, u1, u2, r));
  const boyoq = (poly: V[], rang: 'oq' | 'sariq', tur: Boyoq['tur'], xato = false) => boyoqlar.push({ poly, rang, tur, xato });
  const uzuq = (a: V, b: V, rang: 'oq' | 'sariq', tur: Boyoq['tur'], eni = 0.15) =>
    uzuqChiziq(a, b, eni, 0.5, 0.5).forEach((p) => boyoq(p, rang, tur));
  const belgi = (kod: string, p: V, haydovchiYonalishi: number, ikkinchi?: string, uchinchi?: string) =>
    belgilar.push({ kod, p, th: haydovchiYonalishi + PI, ikkinchi, uchinchi });

  // ─────────────── Mashq o'lchamlari (qaror formulalari) ───────────────
  const W = r2(Math.max(2 * B, Math.min(2.5 * B, WR))); // mashq yo'lagi eni: 2÷2,5B (halqa eniga moslab)
  const Ri = 7.65 - W / 2;                             // ilon izi: tashqi radius 7,65 m

  // ─────────────── 1. Chorraha va to'rt tarmoq ───────────────
  qut(-3.5, 0, 3.5, 48);          // shimoliy tarmoq (yuqori halqagacha)
  qut(-3.5, -44, 3.5, 0);         // janubiy tarmoq
  qut(0, -48, 3.5, -44);          // janubiy tarmoqning sharqiy qatori — pastki yo'lgacha
  qut(0, -3.5, 34, 3.5);          // sharqiy tarmoq (boksgacha)
  qut(-70, -3.5, 0, 3.5);         // g'arbiy tarmoq (chap halqagacha)
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) yumaloq(v(3.5 * sx, 3.5 * sy), v(sx, 0), v(0, sy), 5);

  // Piyodalar o'tish joylari (1.14.1), to'xtash chiziqlari (1.12), markaziy chiziqlar, svetoforlar
  const zebra = (markaz: V, th: number, eni: number, uzun = 3) => {
    // th — harakat yo'nalishi; chiziqlar harakat bo'ylab: eni 0.5 m, oraliq 0.5 m
    const u = uzun / 2;
    for (let t = -eni / 2 + 0.5; t <= eni / 2 - 0.45; t += 1.0)
      boyoq([lokal(markaz, th, -u, t - 0.25), lokal(markaz, th, u, t - 0.25), lokal(markaz, th, u, t + 0.25), lokal(markaz, th, -u, t + 0.25)], 'oq', 'zebra');
  };
  zebra(v(0, 10.5), PI / 2, WA); zebra(v(0, -10.5), PI / 2, WA);
  zebra(v(10.5, 0), 0, WA); zebra(v(-10.5, 0), 0, WA);
  // Kiruvchi qatorlar uchun stop chiziqlari (o'ng qatorda)
  const stopN = [v(-3.25, 13.2), v(0, 13.2)] as [V, V];
  const stopS = [v(0, -13.2), v(3.25, -13.2)] as [V, V];
  const stopE = [v(13.2, 0), v(13.2, 3.25)] as [V, V];
  const stopW = [v(-13.2, -3.25), v(-13.2, 0)] as [V, V];
  for (const s of [stopN, stopS, stopE, stopW]) boyoq(yaxlitChiziq(s[0], s[1], 0.4), 'oq', 'stop');
  // Markaziy chiziq (1.1): qarama-qarshi oqimni ajratadi — bosish xato
  boyoq(yaxlitChiziq(v(0, 13.4), v(0, 41), 0.12), 'oq', 'markaz', true);
  boyoq(yaxlitChiziq(v(0, -13.4), v(0, -30.5), 0.12), 'oq', 'markaz', true);
  boyoq(yaxlitChiziq(v(13.4, 0), v(32, 0), 0.12), 'oq', 'markaz', true);
  boyoq(yaxlitChiziq(v(-13.4, 0), v(-59, 0), 0.12), 'oq', 'markaz', true);
  svetoforlar.push(
    { id: 'S', p: v(4.75, -13.2), th: -PI / 2 },
    { id: 'W', p: v(-13.2, -4.75), th: PI },
    { id: 'E', p: v(13.2, 4.75), th: 0 },
    { id: 'N', p: v(-4.75, 13.2), th: PI / 2 },
  );

  // ─────────────── 2. Halqa yo'l (bir yo'nalishli, soat miliga teskari) ───────────────
  // Yuqori yo'l (g'arbga): ilon izi boshidan yuqori-o'ng burchakkacha
  qut(-20, 48, 62, 52);
  yumaloq(v(-3.5, 48), v(-1, 0), v(0, -1), 4);
  yumaloq(v(3.5, 48), v(1, 0), v(0, -1), 4);
  yoyBant(v(62, 40), 10, 0, PI / 2);             // yuqori-o'ng burchak
  qut(70, -40, 74, 40);                          // o'ng yo'l (shimolga) — tezlashish
  yoyBant(v(62, -40), 10, -PI / 2, PI / 2);      // pastki-o'ng burchak
  qut(3.5, -52, 62, -48);                        // pastki-sharqiy yo'l — temir yo'l
  yumaloq(v(3.5, -48), v(1, 0), v(0, 1), 3);
  qut(-62, -52, -28, -48);                       // pastki-g'arbiy yo'l — estakada
  yoyBant(v(-62, -40), 10, PI, PI / 2);          // pastki-chap burchak
  const ilonOxirY = r2(50 - Ri * (2 - 2 * Math.cos(135 * GRAD)));
  const ilonOxirX = r2(-20 - 2 * Ri * Math.sin(135 * GRAD));
  qut(-74, -40, -70, ilonOxirY - 10);            // chap yo'l (janubga)
  yumaloq(v(-70, 3.5), v(1, 0), v(0, 1), 4);
  yumaloq(v(-70, -3.5), v(1, 0), v(0, -1), 4);
  yoyBant(v(-62, ilonOxirY - 10), 10, PI / 2, PI / 2); // yuqori-chap burchak (ilon izidan keyin)
  qut(-62, ilonOxirY - 2, ilonOxirX, ilonOxirY + 2);   // ilon izidan keyingi yo'l
  // Janubiy tarmoqqa boshlanish yo'li (90° mashqidan keyin) va burchaklar
  const x90 = -28;
  const v0 = r2(x90 + D), v1 = r2(v0 + W);
  const y90 = r2(-48 + 11.5);                    // 90° mashqi: chiqish yo'lagining yuqori chegarasi
  const y90m = r2(y90 - W / 2);                  // chiqish yo'lagi markazi
  qut(r2(v1 + D), y90 - W, -3.5, y90);
  yumaloq(v(-3.5, y90), v(-1, 0), v(0, 1), 3);
  yumaloq(v(-3.5, y90 - W), v(-1, 0), v(0, -1), 3);

  // ─────────────── 3. Mashq maydonlari ───────────────
  // 90 gradus burchak ostida burilishlar ("Z" yo'lak): kirish → chapga → 11,5 m → o'ngga → chiqish
  qut(x90, -48 - W, v1, -48);
  qut(v0, -48 - W, v1, y90);
  qut(v0, y90 - W, r2(v1 + D), y90);
  yumaloq(v(v0, -48), v(-1, 0), v(0, 1), 1);
  yumaloq(v(v1, y90 - W), v(1, 0), v(0, -1), 1);
  const zona90 = [v(x90, -52), v(v1, -52), v(v1, y90 - W), v(r2(v1 + D), y90 - W), v(r2(v1 + D), y90), v(v0, y90), v(v0, -48), v(x90, -48)];
  mashqZonalari.push(zona90);
  uzuq(v(x90, -52 + ICH), v(x90, -48 - ICH), 'sariq', 'mashqChegara');
  uzuq(v(r2(v1 + D), y90 - W + ICH), v(r2(v1 + D), y90 - ICH), 'sariq', 'mashqChegara');
  belgi('1.12.2', v(x90 - 4, -52.9), 0);

  // Ilon izi: 135° chapga, 135° o'ngga, tashqi radius 7,65 m
  const ilonYol = new Yol(v(-20, 50), PI).yoy(Ri, 135).yoy(Ri, -135);
  bolaklar.push(yolBant(ilonYol.n, W));
  const zonaIlon = [...lokalBant(ilonYol.n, W / 2 + 0.6)];
  mashqZonalari.push(zonaIlon);
  uzuq(v(-20, 48 + ICH), v(-20, 52 - ICH), 'sariq', 'mashqChegara');
  uzuq(v(ilonOxirX, ilonOxirY - W / 2 + ICH), v(ilonOxirX, ilonOxirY + W / 2 - ICH), 'sariq', 'mashqChegara');
  belgi('1.12.2', v(-16, 52.9), PI);

  // Boks: sharqiy tarmoq oxirida "T" shaklidagi yo'lak, boks shimolda (qayrilib olish)
  const xb = 40;
  const boksUzun = r2(D + 2.5 * B + D + 1);
  const Wb = r2(2.5 * B);                         // boks eni: 2÷2,5B (yuqori chegara — boksdan burilib chiqishga joy)
  const bx0 = r2(xb + D), bx1 = r2(bx0 + Wb);
  const boksChuqur = r2(D + 1);
  bolaklar.push([v(34, -3.5), v(xb, -W / 2), v(xb, W / 2), v(34, 3.5)]);
  qut(xb - 0.05, -W / 2, xb + boksUzun, W / 2);
  qut(bx0, W / 2 - 0.05, bx1, W / 2 + boksChuqur);
  yumaloq(v(bx0, W / 2), v(-1, 0), v(0, 1), 1);
  yumaloq(v(bx1, W / 2), v(1, 0), v(0, 1), 1);
  const zonaBoks = [v(xb, -W / 2 - 0.3), v(xb + boksUzun + 0.3, -W / 2 - 0.3), v(xb + boksUzun + 0.3, W / 2), v(bx1 + 0.3, W / 2),
    v(bx1 + 0.3, W / 2 + boksChuqur + 0.3), v(bx0 - 0.3, W / 2 + boksChuqur + 0.3), v(bx0 - 0.3, W / 2), v(xb, W / 2)];
  mashqZonalari.push(zonaBoks);
  uzuq(v(xb, -W / 2 + ICH), v(xb, W / 2 - ICH), 'sariq', 'mashqChegara');
  const boksOrqa = W / 2 + boksChuqur - ICH - 0.1;          // boks orqa sariq chizig'i (ichki tomoni)
  const boksNazoratY = r2(boksOrqa - 1.0);                   // nazorat chizig'i: orqa chiziqdan 1 m
  boyoq(yaxlitChiziq(v(bx0 + ICH + 0.1, boksNazoratY), v(bx1 - ICH - 0.1, boksNazoratY), 0.15), 'oq', 'nazorat');

  // Orqaga harakatlanib parallel to'xtash: yuqori yo'lda (g'arbga), joy o'ng tomonda (shimolda)
  const pb1 = 24, pb0 = r2(pb1 - 2 * D), pEni = r2(Math.max(B + 1, 2.8));
  qut(pb0, 51.9, pb1, 52 + pEni);
  const zonaPar = [v(pb0 - D - 0.3, 51.5), v(pb1 + 0.3, 51.5), v(pb1 + 0.3, 52 + pEni + 0.3), v(pb0 - 0.3, 52 + pEni + 0.3), v(pb0 - 0.3, 52.15), v(pb0 - D - 0.3, 52.15)];
  mashqZonalari.push(zonaPar);
  uzuq(v(pb0, 52), v(pb1, 52), 'sariq', 'mashqChegara');
  const parTashqi = 52 + pEni - ICH - 0.1;                   // joyning tashqi (bordyur tomondagi) sariq chizig'i ichki tomoni
  const parNazoratY = r2(parTashqi - 0.4 * prm.K);           // nazorat chizig'i: 0,3÷0,5K
  boyoq(yaxlitChiziq(v(pb0 + ICH + 0.1, parNazoratY), v(pb1 - ICH - 0.1, parNazoratY), 0.1), 'oq', 'nazorat');
  belgi('5.15', v(pb1 + 0.6, 52 + pEni + 0.8), PI, '7.4.1', '7.6.1');

  // Estakada: pastki-g'arbiy yo'lda (sharqqa)
  const q = prm.qiyalik;
  const qiyaL = r2(7 / Math.sqrt(1 + q * q));                // qiya qism 7 m (qaror: >= 6 m)
  const est: Estakada = { boshi: v(-54, -50), th: 0, eni: 3.4, qiya: qiyaL, tepa: 4, qiyalik: q, balandlik: r2(qiyaL * q), stopS: r2(qiyaL - 1 / Math.sqrt(1 + q * q)) };
  estakadalar.push(est);
  boyoq(yaxlitChiziq(v(est.boshi.x + est.stopS, -50 - est.eni / 2 + 0.05), v(est.boshi.x + est.stopS, -50 + est.eni / 2 - 0.05), 0.4), 'oq', 'stop');
  belgi('1.14', v(est.boshi.x - 3, -52.9), 0);

  // Temir yo'l kesishmasi: pastki-sharqiy yo'lda
  temirYollar.push({ markaz: v(25, -50), th: PI / 2, uzunlik: 26, kesishmaEni: 4 });
  boyoq(yaxlitChiziq(v(20.6, -52 + ICH), v(20.6, -48 - ICH), 0.4), 'oq', 'stop');
  belgi('1.2', v(8, -52.9), 0);
  belgi('2.5', v(20.2, -52.9), 0, '1.3.1');

  // Piyodalar o'tish joyi (tartibga solinmagan): chap yo'lda (janubga)
  const zebraP = v(-72, -35);
  zebra(zebraP, -PI / 2, WR, 4);
  piyodaYollari.push({ a: v(-75.6, -35), b: v(-68.4, -35), zebra: quti(-74, -37, -70, -33) });
  belgi('5.16.1', v(-74.9, -32.7), -PI / 2);
  belgi('5.16.2', v(-69.1, -37.3), -PI / 2);

  // Start: chap yo'lda, janubga
  const startY = -12.2;
  boyoq(yaxlitChiziq(v(-74 + ICH, startY), v(-70 - ICH, startY), 0.4), 'oq', 'start');
  yozuvlar.push({ matn: 'START', p: v(-72, startY - 2.2), th: -PI / 2, balandlik: 1 });
  uzuq(v(-74 + ICH, startY - 10.2), v(-70 - ICH, startY - 10.2), 'sariq', 'mashqChegara');
  belgi('tezlik:20', v(-74.9, startY - 10.2), -PI / 2);

  // Tezlashish bo'lagi: o'ng yo'lda (shimolga), 40 m
  const tzBosh = -25, tzOxir = 15;
  belgi('tezlik:40', v(74.9, tzBosh), PI / 2, 'eng:20');
  belgi('tezlik:20', v(74.9, tzOxir), PI / 2);

  // Avariya holatda to'xtash: yuqori yo'lda (g'arbga)
  avariya.push({ p: [v(46, 47.1), v(46, 52.9)], th: 0 });

  // Finish: g'arbiy tarmoqning chiquvchi qatorida (g'arbga)
  const finX = -40.2;
  boyoq(yaxlitChiziq(v(finX, 0.15), v(finX, 3.5 - ICH), 0.4), 'oq', 'start');
  yozuvlar.push({ matn: 'FINISH', p: v(finX + 2.4, Q), th: PI, balandlik: 1 });
  belgi('5.15', v(finX - 1, 4.4), PI);

  // ─────────────── 4. Marshrut (imtihon yo'li — qator markazi) ───────────────
  const y = new Yol(v(-72, -4.25), -PI / 2);
  y.yGacha(-40).yoy(10, 90);                         // chap yo'l → pastki-chap burchak
  y.xGacha(x90);
  // 90° mashqi ichidagi yo'l (yo'naltiruvchi chiziq)
  const xv = r2(v0 + W / 2);
  y.xGacha(xv - 3).yoy(3, 90).yGacha(y90m - 3).yoy(3, -90).xGacha(-4.25 - RK + RJ);
  y.yoy(RK, 90).yGacha(44).yoy(RJ, 90).xGacha(-20);  // janubiy tarmoq → chorraha (to'g'ri) → shimoliy tarmoq → yuqori yo'l
  y.yoy(Ri, 135).yoy(Ri, -135).xGacha(-62).yoy(10, 90).yGacha(-Q + RK).yoy(RK, 90); // ilon izi → chap yo'l → g'arbiy tarmoq
  y.xGacha(34).ga(v(xb, 0)).ga(v(xb + boksUzun - 1.2, 0)); // chorraha (to'g'ri) → sharqiy tarmoq → boks
  const boksQaytish = new Yol(v(xb + 2, 0), PI);
  boksQaytish.ga(v(34, Q)).ga(v(3.5, Q)).yoy(5.25, 90).yGacha(-44).yoy(RJ, 90).xGacha(62).yoy(10, 90).yGacha(40).yoy(10, 90)
    .xGacha(-Q + RK).yoy(RK, 90).yGacha(7).yoy(5.25, -90).xGacha(-60);
  const yol1 = tozala(y.n), yol2 = tozala(boksQaytish.n);

  // Burilish yo'llarini ham asfaltga qo'shamiz (tarmoq va burchaklar orasini to'ldiradi)
  for (const [m, a0, r] of [[v(-Q + RK, 50 - RK), PI / 2, RK], [v(-4.25, 44), 0, RJ], [v(4.25, -44), PI, RJ], [v(Q - RK, y90m + RK), -PI / 2, RK], [v(-72 + RK, -Q + RK), PI, RK], [v(-66, -4.25), PI / 2, RJ]] as [V, number, number][])
    yoyBant(m, r, a0, PI / 2);

  // ─────────────── 5. Asfalt, chegaralar, chet chiziqlari ───────────────
  const asfalt = birlashtir(bolaklar);
  const chegaralar = chegaralarOl(asfalt);
  boyoqlar.push(...chetChiziqlari(chegaralar, mashqZonalari, ICH, 0.1));

  // ─────────────── 6. Qadamlar ───────────────
  const kesma = (x0: number, y0: number, x1: number, y1: number): [V, V] => [v(x0, y0), v(x1, y1)];
  const qism = (yol: V[], a: V, b: V, oldin = 14, keyin = 6) => {
    const s0 = proyeksiya(yol, a).s, s1 = proyeksiya(yol, b).s;
    return kesik(yol, Math.max(0, Math.min(s0, s1) - oldin), Math.max(s0, s1) + keyin);
  };
  const marshrut: Qadam[] = [];
  const qadam = (kod: MashqKodi, kirish: [V, V], chiqish: [V, V], yol: V[], m: Record<string, any> = {}, zona?: V[], nom?: string) => {
    marshrut.push({ kod, nom: nom || MASHQ_NOMI[kod], kirish, chiqish, yol, zona, m, qism: marshrut.length <= 7 ? 0 : 1 });
  };

  qadam('start', kesma(-74, -4.5, -70, -4.5), kesma(-74, startY - 10.2, -70, startY - 10.2), qism(yol1, v(-72, -4.5), v(-72, startY - 10.2), 0),
    { startChiziq: kesma(-74, startY, -70, startY) });
  qadam('piyoda', kesma(-74, -23.5, -70, -23.5), kesma(-74, -37, -70, -37), qism(yol1, v(-72, -23.5), v(-72, -37)),
    { zebra: quti(-74, -37, -70, -33), piyoda: 0 });
  qadam('estakada', kesma(est.boshi.x - 3, -52, est.boshi.x - 3, -48), kesma(est.boshi.x + 2 * qiyaL + est.tepa, -52, est.boshi.x + 2 * qiyaL + est.tepa, -48),
    qism(yol1, v(est.boshi.x - 3, -50), v(est.boshi.x + 2 * qiyaL + est.tepa, -50)),
    { estakada: 0, stopChiziq: kesma(est.boshi.x + est.stopS, -51.7, est.boshi.x + est.stopS, -48.3) });
  qadam('burilish90', kesma(x90, -52, x90, -48), kesma(r2(v1 + D), y90 - W, r2(v1 + D), y90), qism(yol1, v(x90, -50), v(r2(v1 + D), y90m)), {}, zona90);
  qadam('chorraha', kesma(0, -31, 3.5, -31), kesma(0, 12.2, 3.5, 12.2), qism(yol1, v(Q, -31), v(Q, 12.2)),
    { svetofor: 'S', stop: stopS, yonalish: 'togri', chiqishTarmoq: quti(-3.5, 8.5, 3.5, 20) }, undefined, 'Chorraha: to‘g‘riga');
  qadam('ilon', kesma(-20, 48, -20, 52), kesma(ilonOxirX, ilonOxirY - 2, ilonOxirX, ilonOxirY + 2), qism(yol1, v(-20, 50), v(ilonOxirX, ilonOxirY)), {}, zonaIlon);
  qadam('chorraha', kesma(-40, -3.5, -40, 0), kesma(12.2, -3.5, 12.2, 0), qism(yol1, v(-40, -Q), v(12.2, -Q)),
    { svetofor: 'W', stop: stopW, yonalish: 'togri', chiqishTarmoq: quti(8.5, -3.5, 20, 3.5) }, undefined, 'Chorraha: to‘g‘riga');
  qadam('boks', kesma(xb, -W / 2, xb, W / 2), kesma(xb, -W / 2, xb, W / 2), [...qism(yol1, v(xb - 4, 0), v(xb + boksUzun - 1.2, 0), 10, 0)],
    { boks: quti(bx0, W / 2, bx1, W / 2 + boksChuqur), nazoratY: boksNazoratY, orqaY: boksOrqa, xb, uzun: boksUzun }, zonaBoks);
  qadam('chorraha', kesma(30, 0, 30, 3.5), kesma(-3.5, -12.2, 0, -12.2), qism(yol2, v(30, Q), v(-Q, -12.2)),
    { svetofor: 'E', stop: stopE, yonalish: 'chap', chiqishTarmoq: quti(-3.5, -20, 3.5, -8.5) }, undefined, 'Chorraha: chapga burilish');
  qadam('temir', kesma(6, -52, 6, -48), kesma(27.5, -52, 27.5, -48), qism(yol2, v(6, -50), v(27.5, -50)),
    { stopChiziq: kesma(20.6, -51.75, 20.6, -48.25), temir: 0 });
  qadam('tezlashish', kesma(70, tzBosh - 2, 74, tzBosh - 2), kesma(70, tzOxir + 15, 74, tzOxir + 15), qism(yol2, v(72, tzBosh - 2), v(72, tzOxir + 15)),
    { boshi: kesma(70, tzBosh, 74, tzBosh), oxiri: kesma(70, tzOxir, 74, tzOxir), sekinlash: kesma(70, tzOxir + 15, 74, tzOxir + 15) });
  qadam('avariya', kesma(58, 48, 58, 52), kesma(29, 48, 29, 52), qism(yol2, v(58, 50), v(29, 50)),
    { signalOraliq: [52, 42], qurilma: 0 });
  qadam('parallel', kesma(pb1 + 2.5, 48, pb1 + 2.5, 52), kesma(pb0 - D - 1, 48, pb0 - D - 1, 52), qism(yol2, v(pb1 + 2.5, 50), v(pb0 - D - 1, 50)),
    { joy: quti(pb0, 52, pb1, 52 + pEni), nazoratY: parNazoratY, tashqiY: parTashqi, ogzi: 52 }, zonaPar);
  qadam('chorraha', kesma(-3.5, 30, 0, 30), kesma(-12.2, 0, -12.2, 3.5), qism(yol2, v(-Q, 30), v(-12.2, Q)),
    { svetofor: 'N', stop: stopN, yonalish: 'ong', chiqishTarmoq: quti(-20, -3.5, -8.5, 3.5) }, undefined, 'Chorraha: o‘ngga burilish');
  qadam('finish', kesma(-30, 0, -30, 3.5), kesma(finX, 0, finX, 3.5), qism(yol2, v(-30, Q), v(-55, Q), 4, 0),
    { finishChiziq: kesma(finX, 0, finX, 3.5), toxtashOxiri: -52 });

  // Har bir mashq uchun "mashq rejimi" boshlanish joyi: kirishdan ~12 m oldin, yo'lak ustida
  for (const qd of marshrut) {
    const p0 = qd.yol[0], p1 = qd.yol[1] || qd.yol[0];
    qd.m.boshlash = { p: p0, th: Math.atan2(p1.y - p0.y, p1.x - p0.x) };
  }
  marshrut[0].m.boshlash = { p: v(-72, startY + 0.5 + D / 2), th: -PI / 2 };

  // T-chorrahalarda chapga burilishdan oldin ko'rsatkich (marshrut yo'nalishida kesib o'tiladi)
  const signalNuqtalar: SignalNuqta[] = [
    { chiziq: kesma(Q - RK - 1, y90 - W, Q - RK - 1, y90), tomon: 'chap', nom: 'Janubiy tarmoqqa burilish' },
    { chiziq: kesma(0, 41.5, 3.5, 41.5), tomon: 'chap', nom: 'Yuqori yo‘lga burilish' },
    { chiziq: kesma(-74, -Q + RK + 1, -70, -Q + RK + 1), tomon: 'chap', nom: 'G‘arbiy tarmoqqa burilish' },
    { chiziq: kesma(-Q + RK + 1, 48, -Q + RK + 1, 52), tomon: 'chap', nom: 'Shimoliy tarmoqqa burilish' },
  ];
  // To'xtab turish taqiqlangan joylar: piyodalar o'tish joylari, chorraha, temir yo'l kesishmasi
  const taqiqZonalar: V[][] = [
    quti(-74, -37, -70, -33), quti(-3.5, 9, 3.5, 12), quti(-3.5, -12, 3.5, -9), quti(9, -3.5, 12, 3.5), quti(-12, -3.5, -9, 3.5),
    quti(-8.5, -8.5, 8.5, 8.5), quti(22.5, -52, 27.5, -48),
  ];

  const hammasi = asfalt.flat(2);
  const ch = chegara(hammasi);
  return {
    asfalt, chegaralar, boyoqlar, yozuvlar, belgilar, svetoforlar, estakadalar, temirYollar, piyodaYollari, avariya,
    mashqZonalari, marshrut, yolQismlari: [yol1, yol2], signalNuqtalar, taqiqZonalar,
    boshlash: marshrut[0].m.boshlash,
    ramka: { minX: ch.minX - 25, minY: ch.minY - 25, maxX: ch.maxX + 25, maxY: ch.maxY + 25 },
  };
}

/** Polilinaning [s0, s1] oralig'idagi qismi */
function kesik(ch: V[], s0: number, s1: number): V[] {
  const L = chiziqUzunligi(ch);
  const a = Math.max(0, s0), b = Math.min(L, s1);
  const out: V[] = [chiziqdaNuqta(ch, a).p];
  let s = 0;
  for (let i = 1; i < ch.length; i++) {
    s += Math.hypot(ch[i].x - ch[i - 1].x, ch[i].y - ch[i - 1].y);
    if (s > a && s < b) out.push(ch[i]);
  }
  out.push(chiziqdaNuqta(ch, b).p);
  return tozala(out);
}

/** Polilina atrofidagi kenglik bo'yicha zona (mashq hududi uchun) */
function lokalBant(ch: V[], yarim: number): V[] {
  const n = ch.length;
  const chap: V[] = [], ong: V[] = [];
  for (let i = 0; i < n; i++) {
    const a = ch[Math.max(0, i - 1)], b = ch[Math.min(n - 1, i + 1)];
    const th = Math.atan2(b.y - a.y, b.x - a.x);
    chap.push(lokal(ch[i], th, 0, yarim));
    ong.push(lokal(ch[i], th, 0, -yarim));
  }
  return [...ong, ...chap.reverse()];
}
