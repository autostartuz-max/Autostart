import * as THREE from 'three';
import { MASHINA } from './sozlamalar';

/**
 * Sedan modeli (kodda yasalgan, tashqi fayl yo'q). Koordinata: boshlanishi — orqa o'q markazi yerda,
 * +Z — oldinga, +X — chapga, +Y — yuqoriga. Yon profil chiziladi va eniga cho'ziladi (yumaloq qirralar bilan).
 */
export interface MashinaModel {
  guruh: THREE.Group;
  oldGildiraklar: THREE.Object3D[]; // burilish uchun (Y atrofida)
  gildiraklar: THREE.Object3D[]; // aylanish uchun (X atrofida) — hammasi
  chapChiroqlar: THREE.MeshStandardMaterial;
  ongChiroqlar: THREE.MeshStandardMaterial;
  tormozChiroq: THREE.MeshStandardMaterial;
  orqaChiroq: THREE.MeshStandardMaterial;
}

const L = MASHINA.bazasi;
const OLD = L + MASHINA.oldiOsilma; // old bamper (orqa o'qdan)
const ORQA = -MASHINA.orqaOsilma; // orqa bamper

/** Yon profildan (z, y) eniga cho'zilgan geometriya, eni bo'yicha markazlangan */
function profildan(nuqtalar: [number, number][], eni: number, qirra: number, egri = true): THREE.ExtrudeGeometry {
  const sh = new THREE.Shape();
  sh.moveTo(nuqtalar[0][0], nuqtalar[0][1]);
  for (let i = 1; i < nuqtalar.length; i++) {
    const [z, y] = nuqtalar[i];
    if (egri && i + 1 < nuqtalar.length && i % 2 === 1) {
      const [z2, y2] = nuqtalar[i + 1];
      sh.quadraticCurveTo(z, y, z2, y2);
      i++;
    } else sh.lineTo(z, y);
  }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: eni - 2 * qirra, bevelEnabled: true, bevelThickness: qirra, bevelSize: qirra * 0.8, bevelSegments: 4, curveSegments: 16,
  });
  g.rotateY(-Math.PI / 2); // profil Z (uzunlik) ga, cho'zilish X (eni) ga
  g.translate((eni - 2 * qirra) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

/** Yuqoriga qarab torayish: y0 dan yuqoridagi uchlar markazga yaqinlashadi (haqiqiy kuzovdagidek) */
function torayt(g: THREE.BufferGeometry, y0: number, kuch: number) {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > y0) p.setX(i, p.getX(i) * (1 - (y - y0) * kuch));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
}

function tekstura(chiz: (c: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  chiz(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function mashinaYasa(): MashinaModel {
  const guruh = new THREE.Group();
  const eni = MASHINA.eni;

  // Marvarid oq: juda oq bo'lsa quyoshda "kuyib" shakli ko'rinmaydi
  const boyoq = new THREE.MeshPhysicalMaterial({ color: 0xc9ced3, metalness: 0.45, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  const oyna = new THREE.MeshPhysicalMaterial({ color: 0x0d151d, metalness: 0.4, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  const qora = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.55, metalness: 0.2 });
  const xrom = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.18, metalness: 1 });

  // ---- Tana (pastki qism): bamperlar, kapot, bagaj; g'ildirak o'yiqlari pastki chetida ----
  const R = 0.38; // o'yiq radiusi
  const tanaShakl = new THREE.Shape();
  tanaShakl.moveTo(ORQA + 0.05, 0.27);
  tanaShakl.quadraticCurveTo(ORQA - 0.04, 0.3, ORQA - 0.03, 0.55);
  tanaShakl.quadraticCurveTo(ORQA - 0.02, 0.92, ORQA + 0.1, 0.96);
  tanaShakl.lineTo(0.3, 1.0); // bagaj qopqog'i
  tanaShakl.lineTo(2.05, 0.99); // old oyna asosi
  tanaShakl.quadraticCurveTo(2.9, 0.96, 3.25, 0.86); // kapot
  tanaShakl.quadraticCurveTo(OLD + 0.02, 0.8, OLD + 0.01, 0.62); // burun
  tanaShakl.quadraticCurveTo(OLD, 0.3, OLD - 0.15, 0.26);
  tanaShakl.lineTo(L + R + 0.02, 0.26);
  tanaShakl.absarc(L, 0.3, R, 0, Math.PI, false);
  tanaShakl.lineTo(R + 0.02, 0.26);
  tanaShakl.absarc(0, 0.3, R, 0, Math.PI, false);
  tanaShakl.lineTo(ORQA + 0.05, 0.27);
  const qirra = 0.07;
  const tanaG = new THREE.ExtrudeGeometry(tanaShakl, { depth: eni - 2 * qirra, bevelEnabled: true, bevelThickness: qirra, bevelSize: 0.06, bevelSegments: 5, curveSegments: 20 });
  tanaG.rotateY(-Math.PI / 2);
  tanaG.translate((eni - 2 * qirra) / 2, 0, 0);
  tanaG.computeVertexNormals();
  torayt(tanaG, 0.82, 0.16);
  const tana = new THREE.Mesh(tanaG, boyoq);
  tana.castShadow = true; tana.receiveShadow = true;
  guruh.add(tana);

  // ---- Salon (oynalar): old va orqa oyna qiya, tom ----
  const salonG = profildan([[0.32, 0.98], [0.62, 1.38], [0.95, 1.43], [1.55, 1.45], [1.66, 1.44], [2.04, 0.98]], eni - 0.2, 0.05, false);
  torayt(salonG, 0.98, 0.42);
  const salon = new THREE.Mesh(salonG, oyna);
  salon.castShadow = true;
  guruh.add(salon);
  // Tom (bo'yalgan) va ustunlar
  const tomG = profildan([[0.66, 1.39], [0.95, 1.46], [1.55, 1.475], [1.67, 1.42]], eni - 0.16, 0.04, false);
  torayt(tomG, 0.98, 0.42);
  const tom = new THREE.Mesh(tomG, boyoq);
  tom.position.y = 0.012;
  tom.castShadow = true;
  guruh.add(tom);
  for (const [z0, z1] of [[0.34, 0.66], [1.18, 1.26], [1.86, 2.02]] as const) {
    for (const tomon of [1, -1]) {
      const ust = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, z1 - z0), boyoq);
      ust.position.set(tomon * (eni / 2 - 0.105) * 0.9, 1.2, (z0 + z1) / 2);
      ust.rotation.z = tomon * 0.2; // ustun ham ichkariga og'adi
      guruh.add(ust);
    }
  }

  // ---- Bamper va pastki qora qism, ko'zgular, eshik tutqichlari ----
  for (const z of [OLD - 0.02, ORQA + 0.02]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(eni - 0.1, 0.16, 0.18), qora);
    b.position.set(0, 0.33, z);
    b.castShadow = true;
    guruh.add(b);
  }
  // Yon pastki qora qism (porog) — kuzov va yer orasidagi chegara ko'rinsin
  for (const tomon of [1, -1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 1.85), qora);
    p.position.set(tomon * (eni / 2 - 0.02), 0.3, 1.31);
    guruh.add(p);
  }
  for (const tomon of [1, -1]) {
    const kozgu = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.1), boyoq);
    kozgu.position.set(tomon * (eni / 2 + 0.07), 1.04, 2.0);
    guruh.add(kozgu);
    const kozguOyna = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.09), xrom);
    kozguOyna.position.set(tomon * (eni / 2 + 0.07), 1.04, 1.947);
    kozguOyna.rotation.y = Math.PI;
    guruh.add(kozguOyna);
    for (const z of [0.95, 1.85]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.14), xrom);
      t.position.set(tomon * (eni / 2 - 0.005), 0.86, z);
      guruh.add(t);
    }
  }

  // ---- Chiroqlar ----
  const oldChiroq = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6dd, emissiveIntensity: 0.6, roughness: 0.1 });
  const orqaChiroq = new THREE.MeshStandardMaterial({ color: 0x7a0c0c, emissive: 0xff1a1a, emissiveIntensity: 0.6, roughness: 0.15 });
  const tormozChiroq = new THREE.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff2222, emissiveIntensity: 0, roughness: 0.2 });
  const chapChiroqlar = new THREE.MeshStandardMaterial({ color: 0x8a5a10, emissive: 0xffa21a, emissiveIntensity: 0, roughness: 0.2 });
  const ongChiroqlar = chapChiroqlar.clone();
  for (const tomon of [1, -1]) {
    const x = tomon * (eni / 2 - 0.24);
    const old = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.06), oldChiroq);
    old.position.set(x, 0.72, OLD - 0.02);
    guruh.add(old);
    const orqa = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.05), orqaChiroq);
    orqa.position.set(x, 0.84, ORQA - 0.02);
    guruh.add(orqa);
    const tormoz = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.052), tormozChiroq);
    tormoz.position.set(tomon * (eni / 2 - 0.5), 0.84, ORQA - 0.025);
    guruh.add(tormoz);
    const m = tomon > 0 ? chapChiroqlar : ongChiroqlar;
    for (const [z, y] of [[OLD - 0.03, 0.62], [ORQA - 0.025, 0.72]] as const) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.055), m);
      b.position.set(tomon * (eni / 2 - 0.12), y, z);
      guruh.add(b);
    }
    // yon takrorlagich (old qanot)
    const yon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.08), m);
    yon.position.set(tomon * (eni / 2 + 0.001), 0.82, 2.9);
    guruh.add(yon);
  }

  // ---- Raqam va tomdagi "AVTOMAKTAB" belgisi ----
  const raqamT = tekstura((c, w, h) => {
    c.fillStyle = '#f4f6f8'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#111'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = '#111'; c.font = 'bold 76px Arial'; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText('AUTOSTART', w / 2, h / 2 + 4);
  }, 520, 112);
  for (const [z, ry] of [[OLD + 0.07, 0], [ORQA - 0.1, Math.PI]] as const) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.112), new THREE.MeshStandardMaterial({ map: raqamT, roughness: 0.4 }));
    r.position.set(0, ry ? 0.6 : 0.42, z);
    r.rotation.y = ry;
    guruh.add(r);
  }
  const belgiT = tekstura((c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffe14d'); g.addColorStop(1, '#ffc400');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#111'; c.font = 'bold 66px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('AVTOMAKTAB', w / 2, h / 2 + 3);
  }, 512, 110);
  const belgi = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.74), [
    new THREE.MeshStandardMaterial({ map: belgiT, emissive: 0x332a00, emissiveIntensity: 0.15 }),
    new THREE.MeshStandardMaterial({ map: belgiT, emissive: 0x332a00, emissiveIntensity: 0.15 }),
    boyoq, boyoq, boyoq, boyoq,
  ]);
  belgi.position.set(0, 1.56, 1.2);
  belgi.castShadow = true;
  guruh.add(belgi); // BoxGeometry yon tomonlari (±X) ikkalasi ham chapdan o'ngga o'qiladi

  // ---- G'ildiraklar ----
  const shina = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.92 });
  const disk = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.25, metalness: 0.95 });
  const shinaG = new THREE.CylinderGeometry(MASHINA.gildirakR, MASHINA.gildirakR, 0.2, 28);
  shinaG.rotateZ(Math.PI / 2);
  const diskG = new THREE.CylinderGeometry(0.2, 0.2, 0.205, 20);
  diskG.rotateZ(Math.PI / 2);
  const parraG = new THREE.BoxGeometry(0.21, 0.32, 0.045);
  const oldGildiraklar: THREE.Object3D[] = [];
  const gildiraklar: THREE.Object3D[] = [];
  for (const [z, old] of [[L, true], [0, false]] as const) {
    for (const tomon of [1, -1]) {
      const pivot = new THREE.Group(); // burilish (old g'ildiraklar)
      pivot.position.set(tomon * (MASHINA.koleya / 2), MASHINA.gildirakR, z);
      const aylanma = new THREE.Group(); // aylanish
      const s = new THREE.Mesh(shinaG, shina);
      s.castShadow = true;
      aylanma.add(s);
      aylanma.add(new THREE.Mesh(diskG, disk));
      for (let i = 0; i < 5; i++) {
        const p = new THREE.Mesh(parraG, disk);
        p.rotation.x = (i * Math.PI * 2) / 5;
        aylanma.add(p);
      }
      pivot.add(aylanma);
      guruh.add(pivot);
      gildiraklar.push(aylanma);
      if (old) oldGildiraklar.push(pivot);
    }
  }

  return { guruh, oldGildiraklar, gildiraklar, chapChiroqlar, ongChiroqlar, tormozChiroq, orqaChiroq };
}
