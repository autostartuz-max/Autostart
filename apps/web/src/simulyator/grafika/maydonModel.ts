import * as THREE from 'three';
import { type V, siljit, masofa, lokal } from '../asos/geom';
import type { Maydon, Boyoq } from '../dunyo/turlar';
import { ayirma } from '../dunyo/birlashtir';
import type { FizikDunyo } from '../fizika/dunyo';
import { teksturaYukla, simFayl, belgiTekstura, yozuvTekstura } from './teksturalar';

/** Dunyo (x, y) → three (x, h, -y) */
export const P = (p: V, h = 0) => new THREE.Vector3(p.x, h, -p.y);

const OT_BALAND = 0.12;      // orollar va maydon tashqarisi asfaltdan baland (bordyur bilan)
const BORDYUR_BALAND = 0.16;
const BORDYUR_ENI = 0.18;
const BOYOQ_Y = 0.012;

export interface SvetoforModel { qizil: THREE.MeshStandardMaterial; sariq: THREE.MeshStandardMaterial; yashil: THREE.MeshStandardMaterial }

export interface MaydonModel {
  guruh: THREE.Group;
  svetoforlar: Map<string, SvetoforModel>;
  avariyaChiroq: THREE.MeshStandardMaterial;
  dispose(): void;
}

/** Ko'pburchak (teshiklari bilan) → THREE.Shape */
function shakl(poly: V[][]): THREE.Shape {
  const s = new THREE.Shape(poly[0].map((p) => new THREE.Vector2(p.x, p.y)));
  for (const h of poly.slice(1)) s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y))));
  return s;
}

/** Tekis ko'pburchaklar (bo'yoqlar) → bitta geometriya, balandlik funksiyasi bilan */
function tekisGeom(polylar: V[][], h: (p: V) => number) {
  const pos: number[] = [];
  for (const poly of polylar) {
    if (poly.length < 3) continue;
    const tri = THREE.ShapeUtils.triangulateShape(poly.map((p) => new THREE.Vector2(p.x, p.y)), []);
    for (const t of tri) for (const i of t) { const p = poly[i]; pos.push(p.x, h(p), -p.y); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const n = new Float32Array(pos.length);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

/** Yopiq halqani zichlash (har kesma ≤ qadam) */
function zich(h: V[], qadam: number): V[] {
  const out: V[] = [];
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const k = Math.max(1, Math.ceil(masofa(a, b) / qadam));
    for (let t = 0; t < k; t++) out.push({ x: a.x + ((b.x - a.x) * t) / k, y: a.y + ((b.y - a.y) * t) / k });
  }
  return out;
}

/** Bordyurlar: asfalt chegarasi bo'ylab oq-qora (1 m) bo'laklar, ichki yon yuza va ust */
function bordyurGeom(halqalar: V[][]) {
  const pos: number[] = [], rang: number[] = [], uv: number[] = [];
  const oq = new THREE.Color(0xe9e9e6), qora = new THREE.Color(0x2a2a2c);
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, r: THREE.Color, s0: number, s1: number, v0: number, v1: number) => {
    const t = [[s0, v0], [s0, v1], [s1, v1], [s0, v0], [s1, v1], [s1, v0]];
    [a, b, c, a, c, d].forEach((p, k) => { pos.push(p.x, p.y, p.z); rang.push(r.r, r.g, r.b); uv.push(t[k][0], t[k][1]); });
  };
  for (const h0 of halqalar) {
    const h = zich(h0, 0.5);
    const tash = siljit(h, -BORDYUR_ENI, true); // asfalt chapda → tashqariga = o'ngga
    let s = 0;
    for (let i = 0; i < h.length; i++) {
      const j = (i + 1) % h.length;
      const l = masofa(h[i], h[j]);
      const r = Math.floor((s + l / 2) / 1.0) % 2 ? qora : oq;
      const s0 = s; s += l;
      // ust yuza
      quad(P(h[i], BORDYUR_BALAND), P(tash[i], BORDYUR_BALAND), P(tash[j], BORDYUR_BALAND), P(h[j], BORDYUR_BALAND), r, s0, s, 0, BORDYUR_ENI);
      // asfalt tomondagi yon yuza
      quad(P(h[i], 0), P(h[i], BORDYUR_BALAND), P(h[j], BORDYUR_BALAND), P(h[j], 0), r, s0, s, 0.2, 0.2 + BORDYUR_BALAND);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(rang, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** PBR tekstura to'plami: rang, normal, g'adir-budurlik, AO (public/sim-teksturalar/<nom>-*.jpg) */
function pbr(nom: string, takror: number, aniz: number, ao = true) {
  return {
    map: teksturaYukla(simFayl(`${nom}-rang.jpg`), takror, true, aniz),
    normalMap: teksturaYukla(simFayl(`${nom}-normal.jpg`), takror, false, aniz),
    roughnessMap: teksturaYukla(simFayl(`${nom}-gadir.jpg`), takror, false, aniz),
    ...(ao ? { aoMap: teksturaYukla(simFayl(`${nom}-ao.jpg`), takror, false, aniz) } : {}),
  };
}
const pbrTozala = (o: Record<string, any>) => () => { for (const k of ['map', 'normalMap', 'roughnessMap', 'aoMap']) o[k]?.dispose(); };

export function maydonModel(m: Maydon, d: FizikDunyo, aniz: number, soya: boolean): MaydonModel {
  const guruh = new THREE.Group();
  const tozalash: (() => void)[] = [];
  const mat = <T extends THREE.Material>(x: T) => { tozalash.push(() => x.dispose()); return x; };
  const geo = <T extends THREE.BufferGeometry>(x: T) => { tozalash.push(() => x.dispose()); return x; };
  const qosh = (o: THREE.Object3D, qabul = true, tashla = false) => { o.receiveShadow = qabul && soya; o.castShadow = tashla && soya; guruh.add(o); return o; };

  // ── Yer: panjara ichida — maysa (orollar), tashqarida — quruq yer (siyrak o't va tuproq), ufqqacha
  const r = m.ramka, Q = 1600;
  const ramkaPoly = [{ x: r.minX, y: r.minY }, { x: r.maxX, y: r.minY }, { x: r.maxX, y: r.maxY }, { x: r.minX, y: r.maxY }];
  const ichkiPoly = ayirma(ramkaPoly, m.asfalt);
  const tashqiPoly = ayirma([{ x: r.minX - Q, y: r.minY - Q }, { x: r.maxX + Q, y: r.minY - Q }, { x: r.maxX + Q, y: r.maxY + Q }, { x: r.minX - Q, y: r.maxY + Q }], [[ramkaPoly]]);
  const maysaMat = mat(new THREE.MeshStandardMaterial({
    map: teksturaYukla(simFayl('ot-rang.jpg'), 0.3, true, aniz),
    normalMap: teksturaYukla(simFayl('ot-normal.jpg'), 0.3, false, aniz),
    roughness: 0.97, color: 0xc4cf9f,
  }));
  const yerT = pbr('yer', 0.22, aniz);
  tozalash.push(pbrTozala(yerT));
  const yerMat = mat(new THREE.MeshStandardMaterial({ ...yerT, roughness: 1, color: 0xc8c6a8, normalScale: new THREE.Vector2(0.8, 0.8) }));
  for (const [polylar, material] of [[ichkiPoly, maysaMat], [tashqiPoly, yerMat]] as const) {
    for (const poly of polylar) {
      const g = geo(new THREE.ShapeGeometry(shakl(poly), 1));
      g.rotateX(-Math.PI / 2);
      const o = new THREE.Mesh(g, material);
      o.position.y = OT_BALAND;
      qosh(o);
    }
  }

  // ── Asfalt
  const asfaltT = pbr('asfalt2', 0.33, aniz);
  tozalash.push(pbrTozala(asfaltT));
  const asfaltMat = mat(new THREE.MeshStandardMaterial({
    ...asfaltT, normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 1, color: 0xa8a6a2, envMapIntensity: 0.6,
  }));
  for (const poly of m.asfalt) {
    const g = geo(new THREE.ShapeGeometry(shakl(poly), 1));
    g.rotateX(-Math.PI / 2);
    qosh(new THREE.Mesh(g, asfaltMat));
  }

  // ── Bordyurlar
  const betonT = pbr('beton', 1, aniz);
  tozalash.push(pbrTozala(betonT));
  qosh(new THREE.Mesh(geo(bordyurGeom(m.chegaralar)), mat(new THREE.MeshStandardMaterial({ ...betonT, vertexColors: true, roughness: 1 }))), true, true);

  // ── Bo'yoqlar (estakada ustidagilari ham sirtga mos balandlikda)
  const h = (p: V) => d.balandlik(p) + BOYOQ_Y + (d.balandlik(p) > 0 ? 0.03 : 0);
  const boyoqMat = (rang: number) => mat(new THREE.MeshStandardMaterial({ color: rang, roughness: 0.55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const oqlar: V[][] = [], sariqlar: V[][] = [];
  for (const b of m.boyoqlar as Boyoq[]) (b.rang === 'sariq' ? sariqlar : oqlar).push(b.poly);
  // Estakada ustidagi chet chiziqlari (1.1)
  for (const e of m.estakadalar) {
    const L = 2 * e.qiya + e.tepa;
    for (const t of [1, -1]) {
      const a = (e.eni / 2 - 0.25) * t, b = (e.eni / 2 - 0.35) * t;
      oqlar.push([lokal(e.boshi, e.th, 0.05, a), lokal(e.boshi, e.th, L - 0.05, a), lokal(e.boshi, e.th, L - 0.05, b), lokal(e.boshi, e.th, 0.05, b)]);
    }
  }
  const zichPoly = (poly: V[]) => { // estakada qiyaligida bo'yoq sirtdan "ko'tarilmasin" — uzun qirralarni bo'lamiz
    const out: V[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const k = d.balandlik(a) > 0 || d.balandlik(b) > 0 ? Math.max(1, Math.ceil(masofa(a, b) / 0.5)) : 1;
      for (let t = 0; t < k; t++) out.push({ x: a.x + ((b.x - a.x) * t) / k, y: a.y + ((b.y - a.y) * t) / k });
    }
    return out;
  };
  qosh(new THREE.Mesh(geo(tekisGeom(oqlar.map(zichPoly), h)), boyoqMat(0xf2f2ee)));
  qosh(new THREE.Mesh(geo(tekisGeom(sariqlar, h)), boyoqMat(0xf0c419)));

  // ── Yozuvlar (START, FINISH)
  for (const y of m.yozuvlar) {
    const { t, nisbat } = yozuvTekstura(y.matn);
    tozalash.push(() => t.dispose());
    const g = geo(new THREE.PlaneGeometry(y.balandlik * nisbat, y.balandlik));
    const o = new THREE.Mesh(g, mat(new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })));
    o.position.copy(P(y.p, BOYOQ_Y + 0.002));
    // Tekislik yerga yotadi, harflarning "tepasi" harakat yo'nalishiga (th) qaraydi
    o.rotation.set(-Math.PI / 2, y.th - Math.PI / 2, 0, 'YXZ');
    qosh(o);
  }

  // ── Estakada: beton ko'tarilish va shaxmat rangli to'siqlar
  const estT = pbr('beton', 1, aniz);
  tozalash.push(pbrTozala(estT));
  for (const e of m.estakadalar) guruh.add(estakadaModel(e, mat, geo, soya, estT));

  // ── Temir yo'l
  const shagalT = pbr('shagal', 1.2, aniz);
  tozalash.push(pbrTozala(shagalT));
  for (const t of m.temirYollar) guruh.add(temirYolModel(t, mat, geo, soya, shagalT));

  // ── Belgilar
  const ustun = geo(new THREE.CylinderGeometry(0.035, 0.035, 1, 8));
  const ustunMat = mat(new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.6, roughness: 0.45 }));
  const belgiTaxta = geo(new THREE.PlaneGeometry(0.7, 0.7));
  const orqaMat = new Map<string, THREE.MeshStandardMaterial>();
  const belgiQoy = (kod: string, p: V, th: number, balandlik: number) => {
    const tx = belgiTekstura(kod);
    const old = new THREE.Mesh(belgiTaxta, mat(new THREE.MeshStandardMaterial({ map: tx, alphaTest: 0.5, roughness: 0.5, side: THREE.FrontSide })));
    let om = orqaMat.get(kod);
    // Orqa tomon: shu shakl, kulrang metall (rasm qoraytirilgan)
    if (!om) { om = mat(new THREE.MeshStandardMaterial({ map: tx, color: 0x3a3d42, alphaTest: 0.5, metalness: 0.4, roughness: 0.6 })); orqaMat.set(kod, om); }
    const orqa = new THREE.Mesh(belgiTaxta, om);
    orqa.rotation.y = Math.PI;
    orqa.position.z = -0.01;
    const b = new THREE.Group();
    b.add(old, orqa);
    b.position.copy(P(p, balandlik));
    b.rotation.y = Math.atan2(Math.cos(th), -Math.sin(th)); // tekislik +Z ga qaraydi → th yo'nalishiga
    b.traverse((o) => { o.castShadow = soya; });
    guruh.add(b);
  };
  for (const b of m.belgilar) {
    const soni = 1 + (b.ikkinchi ? 1 : 0) + (b.uchinchi ? 1 : 0);
    const tepa = 1.6 + soni * 0.78;
    const u = new THREE.Mesh(ustun, ustunMat);
    u.scale.y = tepa; u.position.copy(P(b.p, tepa / 2));
    qosh(u, false, true);
    belgiQoy(b.kod, b.p, b.th, tepa - 0.36);
    if (b.ikkinchi) belgiQoy(b.ikkinchi, b.p, b.th, tepa - 0.36 - 0.78);
    if (b.uchinchi) belgiQoy(b.uchinchi, b.p, b.th, tepa - 0.36 - 1.56);
  }

  // ── Svetoforlar
  const svetoforlar = new Map<string, SvetoforModel>();
  const korpus = geo(new THREE.BoxGeometry(0.34, 0.98, 0.24));
  const korpusMat = mat(new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6 }));
  const lampa = geo(new THREE.CircleGeometry(0.105, 20));
  const soyabon = geo(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 16, 1, true, 0, Math.PI));
  for (const sv of m.svetoforlar) {
    const g = new THREE.Group();
    const u = new THREE.Mesh(ustun, ustunMat); u.scale.set(1.6, 3.0, 1.6); u.position.y = 1.5;
    const k = new THREE.Mesh(korpus, korpusMat); k.position.y = 3.35;
    g.add(u, k);
    const lm = (rang: number) => mat(new THREE.MeshStandardMaterial({ color: 0x222222, emissive: rang, emissiveIntensity: 0.05, roughness: 0.3 }));
    const modelI: SvetoforModel = { qizil: lm(0xff2a1a), sariq: lm(0xffb000), yashil: lm(0x19e05a) };
    ([['qizil', 3.66], ['sariq', 3.35], ['yashil', 3.04]] as const).forEach(([nom, yy]) => {
      const l = new THREE.Mesh(lampa, modelI[nom]); l.position.set(0, yy, 0.121);
      const s = new THREE.Mesh(soyabon, korpusMat); s.rotation.x = Math.PI / 2; s.rotation.y = Math.PI; s.position.set(0, yy + 0.06, 0.2);
      g.add(l, s);
    });
    g.position.copy(P(sv.p));
    g.rotation.y = Math.atan2(Math.cos(sv.th), -Math.sin(sv.th));
    g.traverse((o) => { o.castShadow = soya; });
    guruh.add(g);
    svetoforlar.set(sv.id, modelI);
  }

  // ── Avariya signal qurilmasi (ikki ustun, qizil chiroq)
  const avariyaChiroq = mat(new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff1a1a, emissiveIntensity: 0.04, roughness: 0.35 }));
  for (const a of m.avariya) for (const p of a.p) {
    const g = new THREE.Group();
    const u = new THREE.Mesh(ustun, ustunMat); u.scale.set(1.4, 2.4, 1.4); u.position.y = 1.2;
    const q = new THREE.Mesh(geo(new THREE.BoxGeometry(0.34, 0.34, 0.2)), korpusMat); q.position.y = 2.55;
    const l = new THREE.Mesh(geo(new THREE.CircleGeometry(0.13, 20)), avariyaChiroq); l.position.set(0, 2.55, 0.101);
    g.add(u, q, l);
    g.position.copy(P(p));
    g.rotation.y = Math.atan2(Math.cos(a.th), -Math.sin(a.th));
    guruh.add(g);
  }

  return {
    guruh, svetoforlar, avariyaChiroq,
    dispose: () => { tozalash.forEach((f) => f()); },
  };
}

type Mat = <T extends THREE.Material>(x: T) => T;
type Geo = <T extends THREE.BufferGeometry>(x: T) => T;

/** Estakada: beton massiv (yuqori sirt profil bo'yicha), ikki tomonda shaxmat rangli to'siqlar */
function estakadaModel(e: Maydon['estakadalar'][number], mat: Mat, geo: Geo, soya: boolean, tx: Record<string, THREE.Texture>) {
  const g = new THREE.Group();
  const L = 2 * e.qiya + e.tepa;
  const hF = (f: number) => (f < e.qiya ? f * e.qiyalik : f < e.qiya + e.tepa ? e.balandlik : (L - f) * e.qiyalik);
  const N = Math.ceil(L / 0.25);
  const fS = (i: number) => (L * i) / N;
  const w = e.eni / 2, T = 0.3, TB = 0.45; // to'siq qalinligi va balandligi
  // Yuqori sirt
  const pos: number[] = [], uv: number[] = [];
  const nuqta = (f: number, l: number, y: number) => { const p = lokal(e.boshi, e.th, f, l); pos.push(p.x, y, -p.y); uv.push(f / 3, l / 3); };
  for (let i = 0; i < N; i++) {
    const f0 = fS(i), f1 = fS(i + 1);
    const y0 = hF(f0) + 0.025, y1 = hF(f1) + 0.025;
    nuqta(f0, -w, y0); nuqta(f1, -w, y1); nuqta(f1, w, y1);
    nuqta(f0, -w, y0); nuqta(f1, w, y1); nuqta(f0, w, y0);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sg.computeVertexNormals();
  const yuza = new THREE.Mesh(geo(sg), mat(new THREE.MeshStandardMaterial({ ...tx, color: 0xc9c5bd, roughness: 1 })));
  yuza.receiveShadow = soya;
  // To'siqlar: tashqi va ichki yon, ust — 0,5 m bo'laklar oq/qora
  const tp: number[] = [], tr: number[] = [];
  const oq = new THREE.Color(0xf0f0ee), qora = new THREE.Color(0x18181a), beton = new THREE.Color(0x8f8b84);
  const uchb = (a: number[], b: number[], c: number[], r: THREE.Color) => { for (const p of [a, b, c]) { tp.push(...p); tr.push(r.r, r.g, r.b); } };
  const q4 = (a: number[], b: number[], c: number[], d: number[], r: THREE.Color) => { uchb(a, b, c, r); uchb(a, c, d, r); };
  const V3 = (f: number, l: number, y: number) => { const p = lokal(e.boshi, e.th, f, l); return [p.x, y, -p.y]; };
  for (const s of [1, -1]) {
    const ich = w * s, tash = (w + T) * s;
    for (let i = 0; i < N; i++) {
      const f0 = fS(i), f1 = fS(i + 1);
      const r = Math.floor((f0 + f1) / 2 / 0.5) % 2 ? qora : oq;
      const y0 = hF(f0), y1 = hF(f1);
      // ichki yon (yo'l tomonga)
      q4(V3(f0, ich, y0), V3(f1, ich, y1), V3(f1, ich, y1 + TB), V3(f0, ich, y0 + TB), r);
      // ust
      q4(V3(f0, ich, y0 + TB), V3(f1, ich, y1 + TB), V3(f1, tash, y1 + TB), V3(f0, tash, y0 + TB), r);
      // tashqi yon: yerdan to'siq tepasigacha (beton massiv + to'siq)
      q4(V3(f0, tash, 0), V3(f0, tash, y0 + TB), V3(f1, tash, y1 + TB), V3(f1, tash, 0), y0 > 0.02 || y1 > 0.02 ? beton : r);
      q4(V3(f0, tash, y0), V3(f0, tash, y0 + TB), V3(f1, tash, y1 + TB), V3(f1, tash, y1), r);
    }
    // uchlari
    for (const f of [0, L]) q4(V3(f, ich, 0), V3(f, tash, 0), V3(f, tash, TB), V3(f, ich, TB), qora);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tr, 3));
  tg.computeVertexNormals();
  const tosiq = new THREE.Mesh(geo(tg), mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide })));
  tosiq.castShadow = tosiq.receiveShadow = soya;
  g.add(yuza, tosiq);
  return g;
}

/** Temir yo'l: relslar, shpallar, kesishmada rezina qoplama. Yo'l relslarga perpendikulyar, eni ~4 m. */
function temirYolModel(t: Maydon['temirYollar'][number], mat: Mat, geo: Geo, soya: boolean, tx: Record<string, THREE.Texture>) {
  const g = new THREE.Group();
  const yarim = t.uzunlik / 2;
  const ox = Math.cos(t.th), oy = Math.sin(t.th);
  const nuqta = (f: number, l: number): V => ({ x: t.markaz.x + ox * f - oy * l, y: t.markaz.y + oy * f + ox * l });
  const fi = Math.atan2(Math.cos(t.th), -Math.sin(t.th)); // lokal +Z → relslar yo'nalishi
  const yolYarim = 2.3;                                    // yo'l (relslar bo'ylab) yarim eni + zaxira
  // Ballast (shag'al) va shpallar — yo'ldan tashqarida
  const ballast = mat(new THREE.MeshStandardMaterial({ ...tx, color: 0xb8b0a6, roughness: 1 }));
  for (const [f0, f1] of [[-yarim, -yolYarim], [yolYarim, yarim]] as const) {
    const o = new THREE.Mesh(geo(new THREE.BoxGeometry(3.0, 0.2, f1 - f0)), ballast);
    o.position.copy(P(nuqta((f0 + f1) / 2, 0), 0.1)); o.rotation.y = fi;
    o.receiveShadow = soya; g.add(o);
  }
  const shpal = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(2.6, 0.12, 0.24)), mat(new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.9 })), Math.ceil(t.uzunlik / 0.62));
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), fi), bir = new THREE.Vector3(1, 1, 1);
  let k = 0;
  for (let f = -yarim + 0.3; f < yarim; f += 0.62) {
    if (Math.abs(f) < yolYarim) continue;
    mm.compose(P(nuqta(f, 0), 0.22), q, bir);
    shpal.setMatrixAt(k++, mm);
  }
  shpal.count = k;
  shpal.castShadow = shpal.receiveShadow = soya;
  g.add(shpal);
  // Kesishma qoplamasi (rezina panellar) — yo'l ustida
  const qoplama = new THREE.Mesh(geo(new THREE.BoxGeometry(t.kesishmaEni, 0.03, 2 * yolYarim)), mat(new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.85 })));
  qoplama.position.copy(P(t.markaz, 0.012)); qoplama.rotation.y = fi;
  qoplama.receiveShadow = soya;
  g.add(qoplama);
  // Relslar: yo'lda qoplama bilan barobar, tashqarida shpallar ustida
  const rels = mat(new THREE.MeshStandardMaterial({ color: 0x9a9da3, metalness: 0.85, roughness: 0.35 }));
  for (const l of [-0.76, 0.76]) {
    for (const [f0, f1, y, bal] of [[-yarim, -yolYarim, 0.33, 0.14], [yolYarim, yarim, 0.33, 0.14], [-yolYarim, yolYarim, 0.03, 0.03]] as const) {
      const o = new THREE.Mesh(geo(new THREE.BoxGeometry(0.075, bal, f1 - f0)), rels);
      o.position.copy(P(nuqta((f0 + f1) / 2, l), y - bal / 2 + 0.01)); o.rotation.y = fi;
      o.castShadow = soya;
      g.add(o);
    }
  }
  return g;
}
