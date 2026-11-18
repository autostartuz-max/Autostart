import * as THREE from 'three';
import { type V, ichida } from '../asos/geom';
import type { Maydon } from '../dunyo/turlar';
import { peshtoqTekstura, oynaTekstura, teksturaYukla, simFayl } from './teksturalar';
import { P } from './maydonModel';
import { modelYukla, nusxala, quti } from './aktivlar';

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

/** Barg to'plamlari atlasi (2×2): har katakda novda va zich barglar, chetlari siyrak — kartaning silueti notekis */
function bargAtlas(): THREE.CanvasTexture {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rnd = tasodif(77);
  for (let k = 0; k < 4; k++) {
    const ox = (k % 2) * 512 + 256, oy = Math.floor(k / 2) * 512 + 256;
    // novdalar
    g.strokeStyle = 'rgb(74,58,40)';
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2, l = 120 + rnd() * 110;
      g.lineWidth = 3 + rnd() * 3;
      g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox + Math.cos(a + 0.4) * l * 0.5, oy + Math.sin(a + 0.4) * l * 0.5, ox + Math.cos(a) * l, oy + Math.sin(a) * l); g.stroke();
    }
    // barglar: markazda zich, chetga siyraklashadi
    for (let i = 0; i < 520; i++) {
      const r = 236 * Math.pow(rnd(), 0.62), a = rnd() * Math.PI * 2;
      const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r;
      const L = 26 + rnd() * 20, W = L * (0.36 + rnd() * 0.14), rot = rnd() * Math.PI * 2;
      const hue = 78 + rnd() * 30, sat = 34 + rnd() * 22, lig = 20 + rnd() * 17 + (r / 236) * 6;
      g.save(); g.translate(x, y); g.rotate(rot);
      const gr = g.createLinearGradient(0, -W / 2, 0, W / 2);
      gr.addColorStop(0, `hsl(${hue},${sat}%,${lig + 9}%)`);
      gr.addColorStop(1, `hsl(${hue + 4},${sat}%,${lig - 4}%)`);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(-L / 2, 0);
      g.quadraticCurveTo(-L / 6, -W, L / 2, 0);
      g.quadraticCurveTo(-L / 6, W, -L / 2, 0);
      g.fill();
      g.strokeStyle = `hsla(${hue},${sat}%,${lig + 18}%,0.55)`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2.2, 0); g.stroke();
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  return t;
}

/**
 * Daraxt toji: ellipsoid ichida tasodifiy yo'nalgan barg kartalari. Normallar toj markazidan
 * tashqariga (sferik) — kartalar bitta hajm sifatida yoritiladi. Har karta ikki tomonlama
 * (ikki uchburchak juftligi, ikkalasida ham tashqi normal).
 */
function tojGeom(urug: number, soni: number, rx: number, ry: number, rz: number, olcham: number) {
  const rnd = tasodif(urug);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < soni; i++) {
    let x = 0, y = 0, z = 0;
    for (let t = 0; t < 20; t++) {
      x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1;
      const d = x * x + y * y + z * z;
      if (d <= 1 && d > 0.18) break;
    }
    const c = new THREE.Vector3(x * rx, y * ry, z * rz);
    q.setFromEuler(e.set(rnd() * Math.PI, rnd() * Math.PI * 2, rnd() * Math.PI));
    const s = olcham * (0.75 + rnd() * 0.5);
    const k = Math.floor(rnd() * 4), u0 = (k % 2) * 0.5, v0 = Math.floor(k / 2) * 0.5;
    const burch = [[-1, -1, u0, v0], [1, -1, u0 + 0.5, v0], [1, 1, u0 + 0.5, v0 + 0.5], [-1, 1, u0, v0 + 0.5]];
    const vs = burch.map(([a, b]) => v.set((a * s) / 2, (b * s) / 2, 0).applyQuaternion(q).add(c).clone());
    for (const tartib of [[0, 1, 2, 0, 2, 3], [0, 2, 1, 0, 3, 2]]) {
      for (const j of tartib) {
        const p = vs[j];
        pos.push(p.x, p.y, p.z);
        n.set(p.x / (rx * rx), p.y / (ry * ry) + 0.25 / ry, p.z / (rz * rz)).normalize();
        nor.push(n.x, n.y, n.z);
        uv.push(burch[j][2], burch[j][3]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Setka (rabitsa) to'qimasi: 0,25 m katakda 5×5 romb (5 sm), sim — kulrang ruxlangan, fon shaffof */
function setkaTekstura(): THREE.CanvasTexture {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const n = 5, q = S / n;
  g.lineCap = 'round';
  for (const [rang, en] of [['rgba(70,74,78,0.9)', 7], ['rgba(196,200,204,1)', 4]] as const) {
    g.strokeStyle = rang; g.lineWidth = en;
    for (let i = -n; i <= 2 * n; i++) {
      g.beginPath(); g.moveTo(i * q, 0); g.lineTo(i * q + S, S); g.stroke();
      g.beginPath(); g.moveTo(i * q + S, 0); g.lineTo(i * q, S); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export interface AtrofModel { guruh: THREE.Group; tayyor: Promise<void>; dispose(): void }

/**
 * Atrof: daraxtlar (barg kartalari, instansli), setka panjara, darvoza, imtihon binosi va kutish joyi,
 * chiroq ustunlari, kuzatuv kameralari, uzoqdagi tepaliklar. Tayyor modellar — Poly Haven (CC0).
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
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), rang = new THREE.Color();
  const Y = new THREE.Vector3(0, 1, 0);
  const matritsa = (p: V, h: number, yaw: number, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(P(p, h), new THREE.Quaternion().setFromAxisAngle(Y, yaw), new THREE.Vector3(sx, sy, sz));

  // Bino (start yonida, g'arbda): old tomoni maydonga (sharqqa) qaraydi
  const BINO = { x: -94, y: -15 };
  const DARVOZA = { y: -34, eni: 6 }; // g'arbiy panjarada

  // ── Daraxtlar: chinor (keng, dumaloq) va terak (baland, ingichka — O'zbekiston yo'l bo'yi)
  const joylar: { p: V; tur: number; k: number }[] = [];
  const soni = [70, 150, 240][sifat];
  for (let i = 0; i < soni * 8 && joylar.length < soni; i++) {
    const tashqi = rnd() < 0.8;
    const p = tashqi
      ? { x: r.minX - 45 + rnd() * (r.maxX - r.minX + 90), y: r.minY - 45 + rnd() * (r.maxY - r.minY + 90) }
      : { x: r.minX + rnd() * (r.maxX - r.minX), y: r.minY + rnd() * (r.maxY - r.minY) };
    const panjaraIchida = p.x > r.minX - 3 && p.x < r.maxX + 3 && p.y > r.minY - 3 && p.y < r.maxY + 3;
    if (tashqi && panjaraIchida) continue;
    if (yolgaYaqin(p, m, 7)) continue;
    if (p.x < -84 && p.x > -106 && p.y > -42 && p.y < 2) continue; // bino va darvoza oldi
    if (joylar.some((j) => Math.abs(j.p.x - p.x) < 4 && Math.abs(j.p.y - p.y) < 4)) continue;
    joylar.push({ p, tur: rnd() < 0.4 ? 1 : 0, k: 0.8 + rnd() * 0.5 });
  }
  // Panjara bo'ylab terak qatori (tashqarida, 6 m oraliq)
  for (const [a, b] of [[{ x: r.minX - 4, y: r.minY - 4 }, { x: r.maxX + 4, y: r.minY - 4 }], [{ x: r.maxX + 4, y: r.minY - 4 }, { x: r.maxX + 4, y: r.maxY + 4 }]] as [V, V][]) {
    const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.floor(L / (sifat === 0 ? 12 : 6));
    for (let i = 0; i <= n; i++) joylar.push({ p: { x: a.x + ((b.x - a.x) * i) / n + (rnd() - 0.5), y: a.y + ((b.y - a.y) * i) / n + (rnd() - 0.5) }, tur: 1, k: 0.85 + rnd() * 0.3 });
  }
  const barg = bargAtlas();
  tozala.push(() => barg.dispose());
  const bargM = M(new THREE.MeshStandardMaterial({ map: barg, alphaTest: 0.42, roughness: 0.82, metalness: 0, envMapIntensity: 0.7 }));
  // Yon tomondan (qirrasidan) ko'rinayotgan kartalar cho'zilgan chiziq bo'lib ko'rinmasin — so'nib yo'qoladi
  bargM.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', `
      { vec3 yuzN = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
        diffuseColor.a *= smoothstep(0.1, 0.34, abs(dot(yuzN, normalize(vViewPosition)))); }
      #include <alphatest_fragment>`);
  };
  const karta = [14, 26, 38][sifat];
  const tojChinor = G(tojGeom(5, karta, 2.6, 2.2, 2.6, 2.4));
  const tojTerak = G(tojGeom(9, Math.round(karta * 1.1), 1.25, 4.6, 1.25, 1.9));
  const tanaG = G(new THREE.CylinderGeometry(0.11, 0.2, 1, 7, 1).translate(0, 0.5, 0));
  const tanaM = M(new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.95 }));
  const chinor = joylar.filter((j) => j.tur === 0), terak = joylar.filter((j) => j.tur === 1);
  const tanalar = new THREE.InstancedMesh(tanaG, tanaM, joylar.length);
  const chI = new THREE.InstancedMesh(tojChinor, bargM, chinor.length);
  const teI = new THREE.InstancedMesh(tojTerak, bargM, terak.length);
  let ti = 0;
  chinor.forEach((j, i) => {
    const yaw = rnd() * 6.28;
    mm.compose(P(j.p, OT), q.setFromAxisAngle(Y, yaw), s.set(j.k, 3.4 * j.k, j.k)); tanalar.setMatrixAt(ti++, mm);
    mm.compose(P(j.p, OT + 5.0 * j.k), q, s.set(j.k, j.k * (0.85 + rnd() * 0.3), j.k)); chI.setMatrixAt(i, mm);
    rang.setHSL(0.27 + rnd() * 0.05, 0.25 + rnd() * 0.2, 0.62 + rnd() * 0.18, THREE.SRGBColorSpace); chI.setColorAt(i, rang);
  });
  terak.forEach((j, i) => {
    const yaw = rnd() * 6.28;
    mm.compose(P(j.p, OT), q.setFromAxisAngle(Y, yaw), s.set(0.8 * j.k, 3.0 * j.k, 0.8 * j.k)); tanalar.setMatrixAt(ti++, mm);
    mm.compose(P(j.p, OT + 6.6 * j.k), q, s.set(j.k, j.k * (0.9 + rnd() * 0.25), j.k)); teI.setMatrixAt(i, mm);
    rang.setHSL(0.25 + rnd() * 0.05, 0.3 + rnd() * 0.2, 0.6 + rnd() * 0.18, THREE.SRGBColorSpace); teI.setColorAt(i, rang);
  });
  for (const o of [tanalar, chI, teI]) { o.castShadow = soya; o.receiveShadow = soya && o !== tanalar; g.add(o); }

  // ── Imtihon binosi (start yonida): suvoq (beton tekstura), oynalar, peshtoq
  const bino = new THREE.Group();
  const devorTx = oynaTekstura();
  devorTx.repeat.set(4, 1);
  tozala.push(() => devorTx.dispose());
  const suvoq = teksturaYukla(simFayl('beton-rang.jpg'), 0.25, true, 4);
  const suvoqN = teksturaYukla(simFayl('beton-normal.jpg'), 0.25, false, 4);
  tozala.push(() => { suvoq.dispose(); suvoqN.dispose(); });
  const suvoqM = M(new THREE.MeshStandardMaterial({ map: suvoq, normalMap: suvoqN, color: 0xefe8da, roughness: 0.92 }));
  const devor = new THREE.Mesh(G(new THREE.BoxGeometry(20, 7, 11)), [
    suvoqM, suvoqM,
    M(new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.8 })), M(new THREE.MeshStandardMaterial({ color: 0x777777 })),
    M(new THREE.MeshStandardMaterial({ map: devorTx, roughness: 0.6, metalness: 0.1 })), M(new THREE.MeshStandardMaterial({ map: devorTx, roughness: 0.6, metalness: 0.1 })),
  ]);
  devor.position.y = OT + 3.5;
  devor.castShadow = devor.receiveShadow = soya;
  const pesh = peshtoqTekstura('AUTOSTART', 'AVTODROM · AMALIY IMTIHON');
  tozala.push(() => pesh.dispose());
  const peshtoq = new THREE.Mesh(G(new THREE.PlaneGeometry(14, 2.6)), M(new THREE.MeshStandardMaterial({ map: pesh, roughness: 0.6, emissive: 0x111111 })));
  peshtoq.position.set(0, OT + 8.0, 5.51);
  const tom = new THREE.Mesh(G(new THREE.BoxGeometry(21, 0.4, 12)), M(new THREE.MeshStandardMaterial({ color: 0x5b6470, roughness: 0.7 })));
  tom.position.y = OT + 7.2;
  // Kirish soyaboni va zinapoya
  const soyabon = new THREE.Mesh(G(new THREE.BoxGeometry(8, 0.22, 3)), M(new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.5, roughness: 0.4 })));
  soyabon.position.set(0, OT + 3.4, 7);
  const zina = new THREE.Mesh(G(new THREE.BoxGeometry(9, 0.3, 3.2)), suvoqM);
  zina.position.set(0, OT + 0.15, 7.1);
  soyabon.castShadow = soya; zina.receiveShadow = soya;
  bino.add(devor, peshtoq, tom, soyabon, zina);
  bino.position.copy(P(BINO));
  bino.rotation.y = Math.PI / 2;
  g.add(bino);

  // ── Uzoqdagi tepaliklar (ufq) — tuman rangiga yaqin, kulrang-yashil
  const tep = G(new THREE.CylinderGeometry(700, 760, 60, 96, 1, true));
  const pos = tep.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      pos.setY(i, 6 + 24 * (0.5 + 0.5 * Math.sin(a * 5 + 1.3)) * (0.6 + 0.4 * Math.sin(a * 13)));
    } else pos.setY(i, -2);
  }
  tep.computeVertexNormals();
  g.add(new THREE.Mesh(tep, M(new THREE.MeshStandardMaterial({ color: 0x7d8a72, roughness: 1, side: THREE.BackSide, fog: true }))));

  // ── Tayyor modellar (asinxron yuklanadi)
  const ss = { tashla: soya, qabul: soya };
  const qoshM = (o: THREE.Object3D) => { g.add(o); };

  // Setka panjara (2,35 m) — perimetr bo'ylab; darvoza va bino oralig'i bo'sh qoladi
  const panjara = modelYukla('modular_chainlink_fence').then((ild) => {
    const panel = (n: string) => n === 'modular_chainlink_fence_double';
    const ustun = (n: string) => n === 'modular_chainlink_fence_post';
    const pq = quti(ild, panel), uq = quti(ild, ustun);
    const pc = pq.getCenter(new THREE.Vector3()), uc = uq.getCenter(new THREE.Vector3());
    const pEn = pq.max.x - pq.min.x;
    const pJoy: THREE.Matrix4[] = [], uJoy: THREE.Matrix4[] = [], sJoy: THREE.Matrix4[] = [];
    const c = [{ x: r.minX, y: r.minY }, { x: r.maxX, y: r.minY }, { x: r.maxX, y: r.maxY }, { x: r.minX, y: r.maxY }];
    const bosh = (p: V) => Math.abs(p.x - r.minX) < 0.5 && ((p.y > DARVOZA.y - DARVOZA.eni / 2 - 0.6 && p.y < DARVOZA.y + DARVOZA.eni / 2 + 0.6) || (p.y > BINO.y - 10.5 && p.y < BINO.y + 10.5));
    for (let k = 0; k < 4; k++) {
      const a = c[k], b = c[(k + 1) % 4];
      const L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.round(L / 2.0), qd = L / n;
      const yaw = Math.atan2(b.y - a.y, b.x - a.x);
      const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
      for (let i = 0; i <= n; i++) {
        const p = { x: a.x + ux * qd * i, y: a.y + uy * qd * i };
        if (i < n) {
          const o = { x: p.x + ux * qd / 2, y: p.y + uy * qd / 2 };
          if (!bosh(o)) {
            pJoy.push(matritsa(o, OT, yaw, (qd - 0.14) / pEn).multiply(new THREE.Matrix4().makeTranslation(-pc.x, -pq.min.y, -pc.z)));
            sJoy.push(matritsa(o, OT, yaw, qd - 0.12));
          }
        }
        if (!bosh(p) || bosh({ x: p.x, y: p.y + 2.1 }) !== bosh({ x: p.x, y: p.y - 2.1 })) uJoy.push(matritsa(p, OT, yaw).multiply(new THREE.Matrix4().makeTranslation(-uc.x, -uq.min.y, -uc.z)));
      }
    }
    // Ramka (yuqori quvur) modeldan; setkaning o'zi — shaffof to'qimali tekislik (modelda alfa yo'q)
    qoshM(nusxala(ild, pJoy, { tashla: soya, qabul: false }, panel, 'modular_chainlink_fence_wire'));
    qoshM(nusxala(ild, uJoy, ss, ustun));
    const BAL = 2.2;
    const setka = setkaTekstura();
    setka.repeat.set(2.0 / 0.25, BAL / 0.25);
    tozala.push(() => setka.dispose());
    const sim = new THREE.InstancedMesh(G(new THREE.PlaneGeometry(1, BAL).translate(0, BAL / 2 + 0.05, 0)),
      M(new THREE.MeshStandardMaterial({ map: setka, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.45 })), sJoy.length);
    sJoy.forEach((j, i) => sim.setMatrixAt(i, j));
    sim.castShadow = soya;
    g.add(sim);
  });

  // Darvoza (g'arbiy panjarada, 6 m)
  const darvoza = modelYukla('large_iron_gate').then((ild) => {
    const b = quti(ild), c0 = b.getCenter(new THREE.Vector3());
    const en = b.max.x - b.min.x;
    const j = matritsa({ x: r.minX, y: DARVOZA.y }, OT, Math.PI / 2, DARVOZA.eni / en, 0.85, 1).multiply(new THREE.Matrix4().makeTranslation(-c0.x, -b.min.y, -c0.z));
    qoshM(nusxala(ild, [j], ss));
  });

  // Chiroq ustunlari: yo'l chetida, ~34 m oraliq, qo'li yo'lga qaragan (model 3,9 m → 7,4 m)
  const chiroqJoy: { p: V; yaw: number }[] = [];
  for (const h of m.chegaralar) {
    let s0 = 0;
    for (let i = 1; i < h.length; i++) {
      s0 += Math.hypot(h[i].x - h[i - 1].x, h[i].y - h[i - 1].y);
      if (s0 > 34) {
        s0 = 0;
        const p = h[i], o = h[i - 1];
        const nx = -(p.y - o.y), ny = p.x - o.x, l = Math.hypot(nx, ny) || 1; // asfalt tomonga normal
        chiroqJoy.push({ p: { x: p.x - (nx / l) * 1.1, y: p.y - (ny / l) * 1.1 }, yaw: Math.atan2(ny, nx) });
      }
    }
  }
  const chiroqlar = chiroqJoy.filter((c) => !yolgaYaqin(c.p, m, 0.6)).slice(0, sifat === 0 ? 0 : 60);
  if (chiroqlar.length) {
    // Zamonaviy LED yoritgich: konussimon ustun (8 m), egilgan qo'l, yassi chiroq boshi
    const metall = M(new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.75, roughness: 0.38 }));
    const ustunG = G(new THREE.CylinderGeometry(0.06, 0.12, 8, 12).translate(0, 4, 0));
    const qolG = G(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 8).rotateZ(Math.PI / 2 - 0.18).translate(0.8, 8.05, 0));
    const boshG = G(new THREE.BoxGeometry(0.75, 0.1, 0.3).translate(1.68, 8.2, 0));
    const ledG = G(new THREE.PlaneGeometry(0.62, 0.22).rotateX(Math.PI / 2).translate(1.68, 8.145, 0));
    const ledM = M(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 0.15, roughness: 0.3 }));
    for (const [geo, mat] of [[ustunG, metall], [qolG, metall], [boshG, M(new THREE.MeshStandardMaterial({ color: 0x4a4f55, metalness: 0.5, roughness: 0.45 }))], [ledG, ledM]] as const) {
      const im = new THREE.InstancedMesh(geo, mat, chiroqlar.length);
      chiroqlar.forEach((c, i) => im.setMatrixAt(i, matritsa(c.p, OT, c.yaw)));
      im.castShadow = soya && geo !== ledG;
      g.add(im);
    }
  }
  const chiroq = modelYukla('street_lamp_01').then((ild) => {
    const b = quti(ild), c0 = b.getCenter(new THREE.Vector3());
    const joy = [-19.5, -10.5].map((y) => matritsa({ x: -86.6, y }, OT, 0).multiply(new THREE.Matrix4().makeTranslation(-c0.x, -b.min.y, -c0.z)));
    qoshM(nusxala(ild, joy, { tashla: soya, qabul: false }));
  });

  // Kuzatuv kameralari (ustun ustida): start, estakada, chorraha, temir yo'l
  const kameraJoy: { p: V; nishon: V }[] = [
    { p: { x: -78, y: -2 }, nishon: m.boshlash.p },
    ...m.estakadalar.map((e) => ({ p: { x: e.boshi.x + 8, y: e.boshi.y - 6 }, nishon: e.boshi })),
    { p: { x: 9, y: 9 }, nishon: { x: 0, y: 0 } },
    ...m.temirYollar.map((t) => ({ p: { x: t.markaz.x - 6, y: t.markaz.y + 6 }, nishon: t.markaz })),
  ];
  const kUstun = new THREE.InstancedMesh(G(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 10).translate(0, 2.3, 0)), M(new THREE.MeshStandardMaterial({ color: 0xa4a9b0, metalness: 0.7, roughness: 0.35 })), kameraJoy.length);
  kameraJoy.forEach((k, i) => { kUstun.setMatrixAt(i, matritsa(k.p, OT, 0)); });
  kUstun.castShadow = soya;
  g.add(kUstun);
  const kamera = modelYukla('security_camera_01').then((ild) => {
    const b = quti(ild), c0 = b.getCenter(new THREE.Vector3());
    const joy = kameraJoy.map((k) => {
      const yaw = Math.atan2(k.nishon.y - k.p.y, k.nishon.x - k.p.x);
      // model uzun o'qi Z bo'ylab; ob'ektiv −Z deb olinadi → yaw + π/2
      return matritsa(k.p, OT + 4.45, yaw + Math.PI / 2, 1.3, 1.3, 1.3).multiply(new THREE.Matrix4().makeTranslation(-c0.x, -b.max.y, -c0.z));
    });
    qoshM(nusxala(ild, joy, ss));
  });

  // Kutish joyi (bino oldida): o'rindiqlar va butalar
  const orindiq = modelYukla('modular_street_seating').then((ild) => {
    const b = quti(ild), c0 = b.getCenter(new THREE.Vector3());
    const joy = [-21, -18, -12, -9].map((y) => matritsa({ x: -84.5, y }, OT, -Math.PI / 2).multiply(new THREE.Matrix4().makeTranslation(-c0.x, -b.min.y, -c0.z)));
    qoshM(nusxala(ild, joy, ss));
  });
  const buta = modelYukla('shrub_02').then((ild) => {
    const b = quti(ild), c0 = b.getCenter(new THREE.Vector3());
    const joy: THREE.Matrix4[] = [];
    for (let y = -25; y <= -5; y += 2.6) if (y < -16 || y > -14) joy.push(matritsa({ x: -87.2 + (rnd() - 0.5) * 0.4, y }, OT, rnd() * 6.28, 0.6, 0.55, 0.6).multiply(new THREE.Matrix4().makeTranslation(-c0.x, -b.min.y, -c0.z)));
    qoshM(nusxala(ild, joy, ss));
  });
  // Beton to'siqlar: darvozadan kirish yo'lagi chetlari
  const tosiq = modelYukla('concrete_road_barrier').then((ild) => {
    const b = quti(ild), c0 = b.getCenter(new THREE.Vector3());
    const joy: THREE.Matrix4[] = [];
    for (const yy of [DARVOZA.y - DARVOZA.eni / 2 - 0.4, DARVOZA.y + DARVOZA.eni / 2 + 0.4])
      for (let x = r.minX + 1.2; x < r.minX + 9; x += 1.65) joy.push(matritsa({ x, y: yy }, OT, 0).multiply(new THREE.Matrix4().makeTranslation(-c0.x, -b.min.y, -c0.z)));
    qoshM(nusxala(ild, joy, ss));
  });

  const tayyor = Promise.all([panjara, darvoza, chiroq, kamera, orindiq, buta, tosiq]).then(() => undefined);
  return {
    guruh: g, tayyor,
    // Modellar geometriyasi keshda (aktivlar.ts) — bu yerda faqat o'zimiz yaratganlar tozalanadi
    dispose: () => tozala.forEach((f) => f()),
  };
}
