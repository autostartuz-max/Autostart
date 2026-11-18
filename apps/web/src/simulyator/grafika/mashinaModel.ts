import * as THREE from 'three';
import type { MashinaTuri } from '../mashinalar';
import { raqamTekstura, tomBelgiTekstura } from './teksturalar';

type Nq = [number, number];

/** 1D silliq egri (Catmull–Rom / Hermite), x bo'yicha o'sib boruvchi nuqtalar */
function egri(n: Nq[]) {
  return (x: number) => {
    if (x <= n[0][0]) return n[0][1];
    if (x >= n[n.length - 1][0]) return n[n.length - 1][1];
    let i = 0;
    while (x > n[i + 1][0]) i++;
    const p0 = n[Math.max(0, i - 1)], p1 = n[i], p2 = n[i + 1], p3 = n[Math.min(n.length - 1, i + 2)];
    const h = p2[0] - p1[0], t = (x - p1[0]) / h;
    const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * h;
    const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
  };
}

/** Yarim ko'ndalang kesim profilini yoy uzunligi bo'yicha zich nuqtalarga aylantirish */
function profilZich(p: Nq[], n = 40): Nq[] {
  // Catmull-Rom 2D
  const nuq: Nq[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
    for (let k = 0; k < 8; k++) {
      const t = k / 8, t2 = t * t, t3 = t2 * t;
      const f = (A: number, B: number, C: number, D: number) => 0.5 * (2 * B + (-A + C) * t + (2 * A - 5 * B + 4 * C - D) * t2 + (-A + 3 * B - 3 * C + D) * t3);
      nuq.push([f(a[0], b[0], c[0], d[0]), f(a[1], b[1], c[1], d[1])]);
    }
  }
  nuq.push(p[p.length - 1]);
  const u = [0];
  for (let i = 1; i < nuq.length; i++) u.push(u[i - 1] + Math.hypot(nuq[i][0] - nuq[i - 1][0], nuq[i][1] - nuq[i - 1][1]));
  const L = u[u.length - 1];
  const out: Nq[] = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = (L * k) / n;
    while (j < u.length - 2 && u[j + 1] < s) j++;
    const t = (s - u[j]) / (u[j + 1] - u[j] || 1);
    out.push([nuq[j][0] + (nuq[j + 1][0] - nuq[j][0]) * t, nuq[j][1] + (nuq[j + 1][1] - nuq[j][1]) * t]);
  }
  return out;
}

interface Kesim { bot: number; top: number; w: number }

/**
 * Lofting: z bo'ylab kesimlar (bot, top, yarim en) va normallashgan yarim profil (x/w, (y-bot)/(top-bot)).
 * s ∈ [0, 0.5] — o'ng tomon (−X), s ∈ [0.5, 1] — chap tomon (+X). Mashina +Z ga qaraydi.
 */
class Loft {
  private p: Nq[];
  constructor(readonly kesim: (z: number) => Kesim, profil: Nq[]) { this.p = profilZich(profil, 48); }
  /** O'ng tomonda profil x/w nisbati `nisbat` ga tushadigan s (yuqoriga ko'tarilganda birinchi marta) */
  sNisbat(nisbat: number): number {
    const n = this.p.length - 1;
    for (let i = 0; i < n; i++) {
      const a = this.p[i][0], b = this.p[i + 1][0];
      if ((a - nisbat) * (b - nisbat) <= 0 && a !== b && this.p[i][1] > 0.05) return ((i + (nisbat - a) / (b - a)) / n) / 2;
    }
    return 0.25;
  }
  nuqta(z: number, s: number) {
    const k = this.kesim(z);
    const ong = s <= 0.5;
    const t = (ong ? s * 2 : (1 - s) * 2) * (this.p.length - 1);
    const i = Math.min(this.p.length - 2, Math.floor(t)), f = t - i;
    const px = this.p[i][0] + (this.p[i + 1][0] - this.p[i][0]) * f;
    const py = this.p[i][1] + (this.p[i + 1][1] - this.p[i][1]) * f;
    return new THREE.Vector3((ong ? -1 : 1) * px * k.w, k.bot + py * (k.top - k.bot), z);
  }
  /** Sirt bo'lagi (patch): z0..z1, s0..s1; ofset — normal bo'ylab siljish; teskari — ichki tomonga qaragan */
  yuza(z0: number, z1: number, nz: number, s0: number, s1: number, ns: number, ofset = 0, teskari = false) {
    const P: THREE.Vector3[][] = [];
    for (let i = 0; i <= nz; i++) {
      const r: THREE.Vector3[] = [];
      for (let j = 0; j <= ns; j++) r.push(this.nuqta(z0 + ((z1 - z0) * i) / nz, s0 + ((s1 - s0) * j) / ns));
      P.push(r);
    }
    if (ofset) {
      const N: THREE.Vector3[][] = P.map((r, i) => r.map((_, j) => {
        const a = P[Math.min(nz, i + 1)][j].clone().sub(P[Math.max(0, i - 1)][j]);
        const b = P[i][Math.min(ns, j + 1)].clone().sub(P[i][Math.max(0, j - 1)]);
        return a.cross(b).normalize();
      }));
      P.forEach((r, i) => r.forEach((p, j) => { if (Number.isFinite(N[i][j].x)) p.addScaledVector(N[i][j], ofset); }));
    }
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    P.forEach((r, i) => r.forEach((p, j) => { pos.push(p.x, p.y, p.z); uv.push(j / ns, i / nz); }));
    const w = ns + 1;
    for (let i = 0; i < nz; i++) for (let j = 0; j < ns; j++) {
      const a = i * w + j, b = (i + 1) * w + j, c = (i + 1) * w + j + 1, d = i * w + j + 1;
      if (teskari) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
}

/** Old/orqa yuz: loftning oxirgi halqasidan markazga (biroz qavariq) */
function yuzGeom(loft: Loft, zUch: number, qavariq: number, oldi: boolean) {
  const ns = 64, nr = 6;
  const halqa: THREE.Vector3[] = [];
  for (let j = 0; j <= ns; j++) halqa.push(loft.nuqta(zUch, j / ns));
  const k = loft.kesim(zUch);
  const c = new THREE.Vector3(0, (k.bot + k.top) / 2, zUch);
  const pos: number[] = [], idx: number[] = [];
  for (let r = 0; r <= nr; r++) {
    const l = 1 - r / nr; // 1 — chekka, 0 — markaz
    for (let j = 0; j <= ns; j++) {
      const p = c.clone().lerp(halqa[j], l);
      p.z = zUch + (oldi ? 1 : -1) * qavariq * (1 - l * l);
      pos.push(p.x, p.y, p.z);
    }
  }
  const w = ns + 1;
  for (let r = 0; r < nr; r++) for (let j = 0; j < ns; j++) {
    const a = r * w + j, b = (r + 1) * w + j, c2 = (r + 1) * w + j + 1, d = r * w + j + 1;
    // Tashqaridan qaraganda soat miliga teskari bo'lsin (old: +Z, orqa: −Z)
    if (oldi) idx.push(a, b, c2, a, c2, d); else idx.push(a, c2, b, a, d, c2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { g, yuzZ: (x: number, y: number) => { const kk = loft.kesim(zUch); const ex = Math.min(1, Math.abs(x) / kk.w), ey = Math.min(1, Math.abs(y - (kk.bot + kk.top) / 2) / ((kk.top - kk.bot) / 2)); const l = Math.max(ex, ey); return zUch + (oldi ? 1 : -1) * qavariq * (1 - l * l); } };
}

/** Yumaloq burchakli to'rtburchak shakli */
function yumaloqTortburchak(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

export interface Gildirak { joy: THREE.Group; burilish: THREE.Group; aylanish: THREE.Group; old: boolean; chap: boolean }

export interface MashinaModel {
  /** Butun mashina (kuzov markazi, yer sathida) */
  guruh: THREE.Group;
  /** Kuzov (og'ish — pitch/roll — shunga qo'llanadi) */
  kuzov: THREE.Group;
  gildiraklar: Gildirak[];
  rul: THREE.Object3D;
  /** Haydovchi ko'zi (kuzov koordinatasida) — salon kamerasi uchun */
  koz: THREE.Vector3;
  chiroq: {
    far: THREE.MeshStandardMaterial; gabarit: THREE.MeshStandardMaterial; tormoz: THREE.MeshStandardMaterial;
    orqaYurish: THREE.MeshStandardMaterial; chap: THREE.MeshStandardMaterial; ong: THREE.MeshStandardMaterial;
  };
  salon: THREE.Group;
  rangQoy(rang: string): void;
  dispose(): void;
}

/** Kuzov shakli parametrlari */
interface Shakl {
  top: Nq[]; sill: Nq[]; w: Nq[]; tom: Nq[];
  zKabina: [number, number]; // kabina orqa (C ustun) va old (A ustun) asosi
  qavariqOld: number;
}

function shaklTop(t: MashinaTuri): Shakl {
  const h = t.uzunlik / 2;
  if (t.shakl === 'gentra') {
    return {
      top: [[-h, 0.95], [-h + 0.05, 1.0], [-h + 0.14, 1.03], [-h + 0.4, 1.04], [-1.5, 1.04], [-1.0, 1.02], [-0.2, 1.0], [0.62, 0.975], [0.85, 0.96], [1.3, 0.9], [1.8, 0.82], [h - 0.18, 0.78], [h - 0.06, 0.74], [h, 0.66]],
      sill: [[-h, 0.44], [-h + 0.1, 0.34], [-h + 0.3, 0.3], [-1.0, 0.27], [1.0, 0.27], [h - 0.28, 0.27], [h - 0.12, 0.29], [h, 0.33]],
      w: [[-h, 0.7], [-h + 0.04, 0.79], [-h + 0.14, 0.84], [-h + 0.4, 0.858], [-1.0, 0.8625], [1.2, 0.8625], [h - 0.5, 0.855], [h - 0.24, 0.83], [h - 0.09, 0.79], [h, 0.7]],
      tom: [[-1.42, 1.05], [-1.3, 1.17], [-1.12, 1.31], [-0.95, 1.4], [-0.78, 1.435], [-0.4, 1.445], [-0.12, 1.438], [0.04, 1.41], [0.3, 1.27], [0.56, 1.11], [0.82, 0.965]],
      zKabina: [-1.42, 0.82], qavariqOld: 0.05,
    };
  }
  return {
    top: [[-h, 0.96], [-h + 0.05, 1.01], [-h + 0.14, 1.04], [-h + 0.4, 1.055], [-1.5, 1.055], [-1.0, 1.04], [-0.2, 1.02], [0.62, 0.995], [0.85, 0.985], [1.3, 0.93], [1.8, 0.85], [h - 0.18, 0.8], [h - 0.06, 0.765], [h, 0.7]],
    sill: [[-h, 0.44], [-h + 0.1, 0.34], [-h + 0.3, 0.3], [-1.0, 0.27], [1.0, 0.27], [h - 0.28, 0.27], [h - 0.12, 0.29], [h, 0.33]],
    w: [[-h, 0.7], [-h + 0.04, 0.8], [-h + 0.14, 0.845], [-h + 0.4, 0.862], [-1.0, 0.8675], [1.2, 0.8675], [h - 0.5, 0.86], [h - 0.24, 0.835], [h - 0.09, 0.795], [h, 0.71]],
    tom: [[-1.45, 1.06], [-1.32, 1.2], [-1.15, 1.35], [-0.98, 1.455], [-0.8, 1.495], [-0.4, 1.51], [-0.1, 1.502], [0.05, 1.47], [0.3, 1.33], [0.55, 1.16], [0.8, 0.99]],
    zKabina: [-1.45, 0.8], qavariqOld: 0.05,
  };
}

export function mashinaModel(t: MashinaTuri, rangHex: string, soya: boolean): MashinaModel {
  const guruh = new THREE.Group();
  const kuzov = new THREE.Group();
  guruh.add(kuzov);
  const tozala: (() => void)[] = [];
  const M = <T extends THREE.Material>(m: T) => { tozala.push(() => m.dispose()); return m; };
  const G = <T extends THREE.BufferGeometry>(g: T) => { tozala.push(() => g.dispose()); return g; };
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, ota: THREE.Object3D = kuzov, soyaT = true) => {
    const o = new THREE.Mesh(G(g), m);
    o.castShadow = soya && soyaT; o.receiveShadow = soya;
    ota.add(o);
    return o;
  };

  const sh = shaklTop(t);
  const h = t.uzunlik / 2;
  const zR = -h + t.orqaOsilma, zF = zR + t.bazasi;
  const R = t.gildirakR, Ra = R + 0.075, hc = R + 0.012;
  const topF = egri(sh.top), sillF = egri(sh.sill), wF = egri(sh.w), tomF = egri(sh.tom);
  const ark = (z: number, zc: number) => (Math.abs(z - zc) < Ra ? hc + Math.sqrt(Ra * Ra - (z - zc) ** 2) : -1);
  const kesim = (z: number): Kesim => ({ bot: Math.max(sillF(z), ark(z, zF), ark(z, zR)), top: topF(z), w: wF(z) });

  // ── Materiallar
  const boyoq = M(new THREE.MeshPhysicalMaterial({ color: rangHex, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }));
  const qoraPlastik = M(new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.6 }));
  const qoraYaltiroq = M(new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.25, metalness: 0.3 }));
  const xrom = M(new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.15 }));
  const oyna = M(new THREE.MeshPhysicalMaterial({ color: 0x1b2a33, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 1.4, depthWrite: false }));
  const ichki = M(new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.9, envMapIntensity: 0.25 }));
  const shift = M(new THREE.MeshStandardMaterial({ color: 0xb9b5ad, roughness: 0.9 }));
  const chiroq = {
    far: M(new THREE.MeshStandardMaterial({ color: 0xdfe6ee, emissive: 0xfff6e0, emissiveIntensity: 0.06, metalness: 0.6, roughness: 0.12 })),
    gabarit: M(new THREE.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff2010, emissiveIntensity: 0.12, roughness: 0.25 })),
    tormoz: M(new THREE.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff1a0d, emissiveIntensity: 0.05, roughness: 0.25 })),
    orqaYurish: M(new THREE.MeshStandardMaterial({ color: 0xd0d4d8, emissive: 0xffffff, emissiveIntensity: 0.0, roughness: 0.2 })),
    chap: M(new THREE.MeshStandardMaterial({ color: 0x6a4300, emissive: 0xffa21a, emissiveIntensity: 0.0, roughness: 0.25 })),
    ong: M(new THREE.MeshStandardMaterial({ color: 0x6a4300, emissive: 0xffa21a, emissiveIntensity: 0.0, roughness: 0.25 })),
  };

  // ── Kuzov (pastki qism) va ichki qoplama
  const kuzovProfil: Nq[] = [[0, 0], [0.7, 0], [0.9, 0.02], [0.975, 0.1], [1.0, 0.3], [1.0, 0.52], [0.985, 0.74], [0.955, 0.88], [0.88, 0.965], [0.72, 0.995], [0.4, 1.0], [0, 1.0]];
  const loft = new Loft(kesim, kuzovProfil);
  mesh(loft.yuza(-h, h, 96, 0, 1, 56), boyoq);
  const ichLoft = new Loft((z) => { const k = kesim(z); return { bot: k.bot + 0.04, top: k.top - 0.02, w: k.w - 0.05 }; }, kuzovProfil);
  mesh(ichLoft.yuza(-h + 0.3, h - 0.3, 40, 0, 1, 32, 0, true), ichki, kuzov, false);
  // Old va orqa yuz
  const oldYuz = yuzGeom(loft, h, sh.qavariqOld, true);
  mesh(oldYuz.g, boyoq);
  const orqaYuz = yuzGeom(loft, -h, 0.04, false);
  mesh(orqaYuz.g, boyoq);

  // ── Kabina (oynalar) va tom, ustunlar
  const [zk0, zk1] = sh.zKabina;
  const kabinaKesim = (z: number): Kesim => {
    const k = kesim(z);
    return { bot: k.top - 0.006, top: Math.max(k.top - 0.005, tomF(z)), w: k.w - 0.065 };
  };
  const kabinaProfil: Nq[] = [[1.0, 0.0], [0.975, 0.3], [0.94, 0.62], [0.88, 0.85], [0.78, 0.96], [0.6, 0.995], [0.3, 1.0], [0, 1.0]];
  const kabina = new Loft(kabinaKesim, kabinaProfil);
  mesh(kabina.yuza(zk0, zk1, 60, 0, 1, 40), oyna, kuzov, false).renderOrder = 2;
  // Tom (bo'yoq) — ust va ichki shift. Tom cheti: profil x/w ≈ 0,84 (kesim parametri hisoblanadi)
  const tomZ0 = -0.92 + (zk0 + 1.45), tomZ1 = -0.04 + (zk1 - 0.8);
  const sTom = kabina.sNisbat(0.84), sUst = kabina.sNisbat(0.93);
  mesh(kabina.yuza(tomZ0, tomZ1, 24, sTom, 1 - sTom, 20, 0.004), boyoq);
  mesh(kabina.yuza(tomZ0 - 0.08, tomZ1 + 0.04, 18, sTom - 0.01, 1 - sTom + 0.01, 14, -0.012, true), shift, kuzov, false);
  // A ustunlar (old oyna yonlari), C ustunlar (orqa), B ustun (qora)
  for (const [s0, s1] of [[sUst, sTom + 0.006], [1 - sTom - 0.006, 1 - sUst]]) {
    mesh(kabina.yuza(tomZ1 - 0.02, zk1, 22, s0, s1, 4, 0.004), boyoq);
    mesh(kabina.yuza(tomZ1 - 0.02, zk1, 12, s0, s1, 3, -0.01, true), ichki, kuzov, false);
  }
  for (const [s0, s1] of [[0.0, sTom + 0.006], [1 - sTom - 0.006, 1.0]]) {
    mesh(kabina.yuza(zk0, tomZ0 + 0.02, 16, s0, s1, 14, 0.004), boyoq);
    mesh(kabina.yuza(zk0, tomZ0 + 0.02, 8, s0, s1, 8, -0.01, true), ichki, kuzov, false);
    mesh(kabina.yuza(-0.5, -0.38, 3, s0, s1, 10, 0.005), qoraYaltiroq);
    // Oyna osti bezagi (beltline)
    mesh(kabina.yuza(tomZ0, zk1 - 0.06, 30, s0 < 0.5 ? 0.0 : 0.985, s0 < 0.5 ? 0.015 : 1.0, 1, 0.006), xrom);
  }

  // ── Old yuz: faralar, panjara, havo olgich, tuman chiroqlari, raqam
  const kOld = kesim(h);
  const qoyOld = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, ag = 0) => {
    const o = mesh(g, m); o.position.set(x, y, oldYuz.yuzZ(x, y) + 0.004); o.rotation.y = ag; return o;
  };
  const faraShakl = G(new THREE.ShapeGeometry(yumaloqTortburchak(0.36, 0.13, 0.05)));
  for (const s of [1, -1]) {
    qoyOld(faraShakl, chiroq.far, s * 0.55, kOld.top - 0.08, s * 0.32);
    const b = qoyOld(G(new THREE.CircleGeometry(0.028, 16)), chiroq[s > 0 ? 'chap' : 'ong'], s * 0.71, kOld.top - 0.11, s * 0.4);
    b.position.z += 0.002;
    qoyOld(G(new THREE.CircleGeometry(0.045, 20)), chiroq.far, s * 0.58, kOld.bot + 0.12);
  }
  qoyOld(G(new THREE.ShapeGeometry(yumaloqTortburchak(0.7, 0.09, 0.03))), qoraYaltiroq, 0, kOld.top - 0.1);
  qoyOld(G(new THREE.PlaneGeometry(0.7, 0.014)), xrom, 0, kOld.top - 0.1).position.z += 0.002;
  qoyOld(G(new THREE.ShapeGeometry(yumaloqTortburchak(0.92, 0.16, 0.05))), qoraPlastik, 0, kOld.bot + 0.13);
  const raqam = raqamTekstura();
  tozala.push(() => raqam.dispose());
  const raqamMat = M(new THREE.MeshStandardMaterial({ map: raqam, roughness: 0.5 }));
  qoyOld(G(new THREE.PlaneGeometry(0.52, 0.112)), raqamMat, 0, kOld.bot + 0.13).position.z += 0.004;

  // ── Orqa yuz: chiroqlar, raqam
  const kOrqa = kesim(-h);
  const qoyOrqa = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, ag = 0) => {
    const o = mesh(g, m); o.position.set(x, y, orqaYuz.yuzZ(x, y) - 0.004); o.rotation.y = Math.PI + ag; return o;
  };
  const orqaChiroqShakl = G(new THREE.ShapeGeometry(yumaloqTortburchak(0.32, 0.15, 0.04)));
  for (const s of [1, -1]) {
    qoyOrqa(orqaChiroqShakl, chiroq.gabarit, s * 0.58, kOrqa.top - 0.13, -s * 0.28);
    qoyOrqa(G(new THREE.PlaneGeometry(0.12, 0.05)), chiroq.tormoz, s * 0.6, kOrqa.top - 0.11, -s * 0.28).position.z -= 0.002;
    qoyOrqa(G(new THREE.PlaneGeometry(0.09, 0.04)), chiroq[s > 0 ? 'chap' : 'ong'], s * 0.68, kOrqa.top - 0.17, -s * 0.28).position.z -= 0.002;
    qoyOrqa(G(new THREE.PlaneGeometry(0.08, 0.04)), chiroq.orqaYurish, s * 0.48, kOrqa.top - 0.17, -s * 0.28).position.z -= 0.002;
  }
  qoyOrqa(G(new THREE.PlaneGeometry(0.52, 0.112)), raqamMat, 0, kOrqa.top - 0.3);
  qoyOrqa(G(new THREE.PlaneGeometry(0.62, 0.02)), xrom, 0, kOrqa.top - 0.2);
  // Uchinchi tormoz chirog'i (orqa oyna tepasida)
  const uchTormoz = mesh(G(new THREE.PlaneGeometry(0.34, 0.03)), chiroq.tormoz);
  const ut = kabina.nuqta(zk0 + 0.42, 0.5);
  uchTormoz.position.set(0, ut.y - 0.02, ut.z - 0.03); uchTormoz.rotation.set(-0.85, Math.PI, 0);

  // ── Eshik chiziqlari, tutqichlar, ko'zgular, yon burilish takrorlagichlari
  for (const z of [zF - Ra - 0.06, -0.42, zR + Ra + 0.04]) {
    for (const [s0, s1] of [[0.07, 0.36], [0.64, 0.93]]) mesh(loft.yuza(z - 0.006, z + 0.006, 1, s0, s1, 12, 0.003), qoraPlastik);
  }
  const tutqich = G(new THREE.BoxGeometry(0.022, 0.03, 0.15));
  for (const s of [1, -1]) for (const z of [-0.12, -0.86]) {
    const p = loft.nuqta(z, s > 0 ? 0.72 : 0.28);
    const o = mesh(tutqich, xrom); o.position.set(p.x + s * 0.008, p.y, p.z);
  }
  for (const s of [1, -1]) {
    const p = kabina.nuqta(zk1 - 0.12, s > 0 ? 0.97 : 0.03);
    const oyoq = mesh(G(new THREE.BoxGeometry(0.06, 0.05, 0.1)), qoraPlastik); oyoq.position.set(p.x + s * 0.04, p.y + 0.04, p.z);
    const korpus = mesh(G(new THREE.BoxGeometry(0.2, 0.12, 0.1)), boyoq); korpus.position.set(p.x + s * 0.16, p.y + 0.09, p.z - 0.01);
    const koz = mesh(G(new THREE.PlaneGeometry(0.17, 0.095)), M(new THREE.MeshStandardMaterial({ color: 0x9fb3c2, metalness: 1, roughness: 0.05 })));
    koz.position.set(p.x + s * 0.16, p.y + 0.09, p.z - 0.062); koz.rotation.y = Math.PI;
    const tk = mesh(G(new THREE.BoxGeometry(0.02, 0.025, 0.07)), chiroq[s > 0 ? 'chap' : 'ong']);
    const lp = loft.nuqta(zF + 0.62, s > 0 ? 0.71 : 0.29); tk.position.set(lp.x + s * 0.01, lp.y, lp.z);
  }

  // ── Tom belgisi (o'quv avtomobili)
  const tb = tomBelgiTekstura();
  tozala.push(() => tb.dispose());
  const tomBelgi = new THREE.Group();
  const tbg = mesh(G(new THREE.BoxGeometry(0.62, 0.2, 0.16)), M(new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.5 })), tomBelgi);
  for (const s of [1, -1]) {
    const yuz = mesh(G(new THREE.PlaneGeometry(0.6, 0.188)), M(new THREE.MeshStandardMaterial({ map: tb, roughness: 0.5, emissive: 0x332200, emissiveIntensity: 0.2 })), tomBelgi);
    yuz.position.z = s * 0.081; if (s < 0) yuz.rotation.y = Math.PI;
  }
  tbg.castShadow = soya;
  const tomTepa = kabina.nuqta(-0.45, 0.5);
  tomBelgi.position.set(0, tomTepa.y + 0.11, -0.45);
  tomBelgi.rotation.y = Math.PI / 2;
  kuzov.add(tomBelgi);

  // ── Salon: panel, rul, o'rindiqlar
  const salon = new THREE.Group();
  kuzov.add(salon);
  // Panel: ustki qismi ~1,0 m (haydovchi ko'zi 1,18 m — yo'l ko'rinadi)
  const panelY = topF(zk1) - 0.04;
  const panel = mesh(G(new THREE.BoxGeometry(1.5, 0.2, 0.5)), ichki, salon, false);
  panel.position.set(0, panelY - 0.1, zk1 - 0.3);
  const panelLab = mesh(G(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 12, 1, false, 0, Math.PI)), ichki, salon, false);
  panelLab.rotation.set(0, 0, Math.PI / 2); panelLab.position.set(0, panelY, zk1 - 0.55);
  const asboblar = mesh(G(new THREE.BoxGeometry(0.36, 0.1, 0.14)), qoraYaltiroq, salon, false);
  asboblar.position.set(0.37, panelY + 0.05, zk1 - 0.5);
  const konsol = mesh(G(new THREE.BoxGeometry(0.26, 0.42, 0.3)), ichki, salon, false);
  konsol.position.set(0, panelY - 0.3, zk1 - 0.62);
  const ichKozgu = mesh(G(new THREE.BoxGeometry(0.24, 0.07, 0.03)), qoraPlastik, salon, false);
  ichKozgu.position.set(0, tomF(zk1 - 0.75) - 0.12, zk1 - 0.75);
  // Rul (haydovchi chapda: +X)
  const rul = new THREE.Group();
  const rulGard = mesh(G(new THREE.TorusGeometry(0.185, 0.022, 10, 32)), qoraPlastik, rul, false);
  void rulGard;
  for (const a of [Math.PI / 2 + 0.2, Math.PI / 2 - 0.2 + Math.PI, -Math.PI / 2]) {
    const sp = mesh(G(new THREE.BoxGeometry(0.17, 0.035, 0.02)), qoraPlastik, rul, false);
    sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0); sp.rotation.z = a;
  }
  mesh(G(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16)), qoraPlastik, rul, false).rotation.x = Math.PI / 2;
  const rulOq = new THREE.Group();
  rulOq.position.set(0.37, panelY - 0.09, zk1 - 0.74);
  rulOq.rotation.x = 0.42; // tepa qismi oldinga egilgan
  rulOq.add(rul);
  salon.add(rulOq);
  // O'rindiqlar
  const orindiq = (x: number, z: number, en: number) => {
    const o = mesh(G(new THREE.BoxGeometry(en, 0.12, 0.5)), ichki, salon, false); o.position.set(x, 0.52, z);
    const s = mesh(G(new THREE.BoxGeometry(en, 0.62, 0.12)), ichki, salon, false); s.position.set(x, 0.86, z - 0.28); s.rotation.x = -0.18;
  };
  orindiq(0.37, -0.35, 0.5); orindiq(-0.37, -0.35, 0.5); orindiq(0, -1.18, 1.35);
  const koz = new THREE.Vector3(0.37, panelY + 0.2, zk1 - 1.2);

  // ── G'ildiraklar
  const shinaProfil: THREE.Vector2[] = [];
  const W = 0.19;
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 12;
    shinaProfil.push(new THREE.Vector2(R - 0.035 + Math.cos(a) * 0.035, Math.sin(a) * (W / 2)));
  }
  shinaProfil.unshift(new THREE.Vector2(R - 0.11, -W / 2 + 0.01));
  shinaProfil.push(new THREE.Vector2(R - 0.11, W / 2 - 0.01));
  const shinaG = G(new THREE.LatheGeometry(shinaProfil, 36));
  shinaG.rotateZ(Math.PI / 2);
  const shinaM = M(new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.92 }));
  const diskM = M(new THREE.MeshStandardMaterial({ color: 0xc4c8cd, metalness: 0.9, roughness: 0.28 }));
  const diskG = G(new THREE.CylinderGeometry(R - 0.12, R - 0.12, 0.03, 32)); diskG.rotateZ(Math.PI / 2);
  const ichDiskG = G(new THREE.CylinderGeometry(R - 0.115, R - 0.115, 0.012, 32)); ichDiskG.rotateZ(Math.PI / 2);
  const nurG = G(new THREE.BoxGeometry(0.03, 0.05, R - 0.17));
  const tormozDiskG = G(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24)); tormozDiskG.rotateZ(Math.PI / 2);
  const gildiraklar: Gildirak[] = [];
  for (const [z, old] of [[zF, true], [zR, false]] as [number, boolean][]) for (const s of [1, -1]) {
    const joy = new THREE.Group();
    joy.position.set(s * (t.koleya / 2), R, z);
    const burilish = new THREE.Group();
    const aylanish = new THREE.Group();
    joy.add(burilish); burilish.add(aylanish);
    mesh(shinaG, shinaM, aylanish);
    const tashqi = s * (W / 2 - 0.035);
    const ichDisk = mesh(ichDiskG, M(new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.7 })), aylanish, false); ichDisk.position.x = tashqi - s * 0.03;
    const disk = mesh(diskG, diskM, aylanish, false); disk.position.x = tashqi; disk.scale.set(1, 0.25, 0.25);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const n = mesh(nurG, diskM, aylanish, false);
      n.position.set(tashqi, Math.sin(a) * (R - 0.17) / 2, Math.cos(a) * (R - 0.17) / 2);
      n.rotation.x = -a;
    }
    const gupchak = mesh(G(new THREE.CylinderGeometry(0.045, 0.05, 0.03, 16)), xrom, aylanish, false);
    gupchak.rotation.z = Math.PI / 2; gupchak.position.x = tashqi + s * 0.01;
    const td = mesh(tormozDiskG, M(new THREE.MeshStandardMaterial({ color: 0x6d6f73, metalness: 0.8, roughness: 0.4 })), burilish, false);
    td.position.x = -s * 0.03;
    kuzov.parent!.add(joy); // g'ildiraklar kuzov og'ishiga bog'liq emas
    gildiraklar.push({ joy, burilish, aylanish, old, chap: s > 0 });
  }

  return {
    guruh, kuzov, gildiraklar, rul, koz, chiroq, salon,
    rangQoy: (r: string) => { boyoq.color.set(r); },
    dispose: () => tozala.forEach((f) => f()),
  };
}
