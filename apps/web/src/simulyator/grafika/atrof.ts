import * as THREE from 'three';
import { type V, ichida } from '../asos/geom';
import type { Maydon } from '../dunyo/turlar';
import { peshtoqTekstura, oynaTekstura } from './teksturalar';
import { P } from './maydonModel';

/** Takrorlanadigan tasodif */
function tasodif(urug: number) {
  let u = urug >>> 0;
  return () => { u = (u + 0x6d2b79f5) >>> 0; let t = u; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Nuqta asfaltga (va zaxira masofaga) yaqinmi */
function yolgaYaqin(p: V, m: Maydon, zaxira: number) {
  for (const poly of m.asfalt) {
    if (ichida(p, poly[0]) && !poly.slice(1).some((h) => ichida(p, h))) return true;
  }
  for (const h of m.chegaralar) for (let i = 0; i < h.length; i += 2) {
    const q = h[i];
    if (Math.abs(q.x - p.x) < zaxira && Math.abs(q.y - p.y) < zaxira && Math.hypot(q.x - p.x, q.y - p.y) < zaxira) return true;
  }
  return false;
}

export interface AtrofModel { guruh: THREE.Group; dispose(): void }

/**
 * Atrof: daraxtlar (instansli), panjara, imtihon binosi, chiroq ustunlari, uzoqdagi tepaliklar.
 * sifat: 0 — past (kam daraxt, soyasiz), 1 — o'rta, 2 — yuqori.
 */
export function atrofModel(m: Maydon, sifat: number, soya: boolean): AtrofModel {
  const g = new THREE.Group();
  const tozala: (() => void)[] = [];
  const M = <T extends THREE.Material>(x: T) => { tozala.push(() => x.dispose()); return x; };
  const G = <T extends THREE.BufferGeometry>(x: T) => { tozala.push(() => x.dispose()); return x; };
  const r = m.ramka;
  const rnd = tasodif(2026);
  const OT = 0.12;

  // ── Daraxtlar
  const joylar: { p: V; tur: number; k: number }[] = [];
  const soni = [140, 320, 520][sifat];
  for (let i = 0; i < soni * 6 && joylar.length < soni; i++) {
    const tashqi = rnd() < 0.7;
    const p = tashqi
      ? { x: r.minX - 40 + rnd() * (r.maxX - r.minX + 80), y: r.minY - 40 + rnd() * (r.maxY - r.minY + 80) }
      : { x: r.minX + rnd() * (r.maxX - r.minX), y: r.minY + rnd() * (r.maxY - r.minY) };
    const panjaraIchida = p.x > r.minX + 2 && p.x < r.maxX - 2 && p.y > r.minY + 2 && p.y < r.maxY - 2;
    if (tashqi && panjaraIchida) continue;
    if (yolgaYaqin(p, m, 5.5)) continue;
    if (p.x < -84 && p.x > -104 && p.y > -32 && p.y < 2) continue; // bino joyi
    if (joylar.some((j) => Math.abs(j.p.x - p.x) < 3 && Math.abs(j.p.y - p.y) < 3)) continue;
    joylar.push({ p, tur: rnd() < 0.45 ? 0 : 1, k: 0.75 + rnd() * 0.6 });
  }
  const tana = G(new THREE.CylinderGeometry(0.14, 0.2, 1, 7));
  const qaragay = G(new THREE.ConeGeometry(1.5, 1, 9));
  const bargli = G(new THREE.IcosahedronGeometry(1, 1));
  const tanaM = M(new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 0.95 }));
  const qaragayM = M(new THREE.MeshStandardMaterial({ color: 0x2e5a34, roughness: 0.9, flatShading: true }));
  const bargliM = M(new THREE.MeshStandardMaterial({ color: 0x4f7f35, roughness: 0.9, flatShading: true }));
  const tanalar = new THREE.InstancedMesh(tana, tanaM, joylar.length);
  const qList = joylar.filter((j) => j.tur === 0), bList = joylar.filter((j) => j.tur === 1);
  const qaragaylar = new THREE.InstancedMesh(qaragay, qaragayM, qList.length * 2);
  const barglilar = new THREE.InstancedMesh(bargli, bargliM, bList.length * 2);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), rang = new THREE.Color();
  joylar.forEach((j, i) => {
    const bal = j.tur === 0 ? 2.2 * j.k : 2.0 * j.k;
    mm.compose(P(j.p, OT + bal / 2), q.identity(), s.set(j.k, bal, j.k));
    tanalar.setMatrixAt(i, mm);
  });
  qList.forEach((j, i) => {
    const y0 = OT + 1.6 * j.k;
    mm.compose(P(j.p, y0 + 2.4 * j.k), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), s.set(j.k * 1.15, 4.4 * j.k, j.k * 1.15));
    qaragaylar.setMatrixAt(i * 2, mm);
    mm.compose(P(j.p, y0 + 4.6 * j.k), q, s.set(j.k * 0.75, 3.0 * j.k, j.k * 0.75));
    qaragaylar.setMatrixAt(i * 2 + 1, mm);
    rang.setHSL(0.33 + rnd() * 0.04, 0.35 + rnd() * 0.15, 0.22 + rnd() * 0.08);
    qaragaylar.setColorAt(i * 2, rang); qaragaylar.setColorAt(i * 2 + 1, rang);
  });
  bList.forEach((j, i) => {
    const y0 = OT + 1.8 * j.k;
    mm.compose(P(j.p, y0 + 1.5 * j.k), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6), s.set(2.0 * j.k, 1.7 * j.k, 2.0 * j.k));
    barglilar.setMatrixAt(i * 2, mm);
    mm.compose(P({ x: j.p.x + (rnd() - 0.5) * 1.4 * j.k, y: j.p.y + (rnd() - 0.5) * 1.4 * j.k }, y0 + 2.6 * j.k), q, s.set(1.4 * j.k, 1.3 * j.k, 1.4 * j.k));
    barglilar.setMatrixAt(i * 2 + 1, mm);
    rang.setHSL(0.24 + rnd() * 0.06, 0.4 + rnd() * 0.15, 0.3 + rnd() * 0.08);
    barglilar.setColorAt(i * 2, rang); barglilar.setColorAt(i * 2 + 1, rang);
  });
  for (const o of [tanalar, qaragaylar, barglilar]) { o.castShadow = soya; o.receiveShadow = false; g.add(o); }

  // ── Panjara (ustunlar + 2 ta gorizontal to'sin)
  const ustunlar: V[] = [];
  const chiz = (a: V, b: V) => {
    const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(L / 3);
    for (let i = 0; i <= n; i++) ustunlar.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
    for (const y of [0.55, 1.35]) {
      const o = new THREE.Mesh(G(new THREE.BoxGeometry(L, 0.05, 0.05)), panjaraM);
      o.position.copy(P({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, OT + y));
      o.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
      g.add(o);
    }
    const t = new THREE.Mesh(G(new THREE.PlaneGeometry(L, 1.5)), torM);
    t.position.copy(P({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, OT + 0.8));
    t.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
    g.add(t);
  };
  const panjaraM = M(new THREE.MeshStandardMaterial({ color: 0x3d5a40, metalness: 0.4, roughness: 0.6 }));
  const torM = M(new THREE.MeshStandardMaterial({ color: 0x3d5a40, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  const c = [{ x: r.minX, y: r.minY }, { x: r.maxX, y: r.minY }, { x: r.maxX, y: r.maxY }, { x: r.minX, y: r.maxY }];
  for (let i = 0; i < 4; i++) chiz(c[i], c[(i + 1) % 4]);
  const ustunI = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.07, 1.7, 0.07)), panjaraM, ustunlar.length);
  ustunlar.forEach((p, i) => { mm.compose(P(p, OT + 0.85), q.identity(), s.set(1, 1, 1)); ustunI.setMatrixAt(i, mm); });
  g.add(ustunI);

  // ── Imtihon binosi (start yonida)
  const bino = new THREE.Group();
  const devorTx = oynaTekstura();
  devorTx.repeat.set(4, 1);
  tozala.push(() => devorTx.dispose());
  const devor = new THREE.Mesh(G(new THREE.BoxGeometry(20, 7, 11)), [
    M(new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: 0.9 })), M(new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: 0.9 })),
    M(new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.8 })), M(new THREE.MeshStandardMaterial({ color: 0x777777 })),
    M(new THREE.MeshStandardMaterial({ map: devorTx, roughness: 0.8 })), M(new THREE.MeshStandardMaterial({ map: devorTx, roughness: 0.8 })),
  ]);
  devor.position.y = OT + 3.5;
  devor.castShadow = devor.receiveShadow = soya;
  const pesh = peshtoqTekstura('AUTOSTART', 'AVTODROM · AMALIY IMTIHON');
  tozala.push(() => pesh.dispose());
  const peshtoq = new THREE.Mesh(G(new THREE.PlaneGeometry(14, 2.6)), M(new THREE.MeshStandardMaterial({ map: pesh, roughness: 0.6, emissive: 0x111111 })));
  peshtoq.position.set(0, OT + 8.0, 5.51);
  const tom = new THREE.Mesh(G(new THREE.BoxGeometry(21, 0.4, 12)), M(new THREE.MeshStandardMaterial({ color: 0x5b6470, roughness: 0.7 })));
  tom.position.y = OT + 7.2;
  bino.add(devor, peshtoq, tom);
  // Bino old tomoni maydonga (sharqqa) qaraydi
  bino.position.copy(P({ x: -94, y: -15 }));
  bino.rotation.y = Math.PI / 2;
  g.add(bino);

  // ── Chiroq ustunlari (yo'l chetlarida, bezak)
  const chiroqJoy: V[] = [];
  for (const h of m.chegaralar) {
    let s0 = 0;
    for (let i = 1; i < h.length; i++) {
      s0 += Math.hypot(h[i].x - h[i - 1].x, h[i].y - h[i - 1].y);
      if (s0 > 34) { s0 = 0; const p = h[i], o = h[i - 1]; const nx = -(p.y - o.y), ny = p.x - o.x, l = Math.hypot(nx, ny) || 1; chiroqJoy.push({ x: p.x - (nx / l) * 1.1, y: p.y - (ny / l) * 1.1 }); }
    }
  }
  const chiroqlar = chiroqJoy.filter((p) => !yolgaYaqin(p, m, 0.6)).slice(0, sifat === 0 ? 0 : 60);
  if (chiroqlar.length) {
    const ust = new THREE.InstancedMesh(G(new THREE.CylinderGeometry(0.06, 0.09, 7, 8)), M(new THREE.MeshStandardMaterial({ color: 0x8c939b, metalness: 0.6, roughness: 0.4 })), chiroqlar.length);
    const bosh = new THREE.InstancedMesh(G(new THREE.BoxGeometry(0.7, 0.14, 0.28)), M(new THREE.MeshStandardMaterial({ color: 0x50565e, roughness: 0.5 })), chiroqlar.length);
    chiroqlar.forEach((p, i) => {
      mm.compose(P(p, OT + 3.5), q.identity(), s.set(1, 1, 1)); ust.setMatrixAt(i, mm);
      mm.compose(P(p, OT + 7), q.identity(), s.set(1, 1, 1)); bosh.setMatrixAt(i, mm);
    });
    ust.castShadow = soya;
    g.add(ust, bosh);
  }

  // ── Uzoqdagi tepaliklar (ufq)
  const tep = G(new THREE.CylinderGeometry(700, 760, 60, 72, 1, true));
  const pos = tep.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      pos.setY(i, 8 + 22 * (0.5 + 0.5 * Math.sin(a * 5 + 1.3)) * (0.6 + 0.4 * Math.sin(a * 13)));
    } else pos.setY(i, -2);
  }
  tep.computeVertexNormals();
  const tepalik = new THREE.Mesh(tep, M(new THREE.MeshStandardMaterial({ color: 0x6f8a5a, roughness: 1, side: THREE.BackSide, fog: true })));
  g.add(tepalik);

  return { guruh: g, dispose: () => tozala.forEach((f) => f()) };
}
