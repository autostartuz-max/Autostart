import * as THREE from 'three';

export interface OdamModel { guruh: THREE.Group; yangila(faza: number, yuryapti: boolean): void; dispose(): void }

/** Oddiy piyoda: tana, bosh, qo'l-oyoqlar; yurganda qo'l-oyoq tebranadi */
export function odamModel(soya: boolean): OdamModel {
  const g = new THREE.Group();
  const tozala: (() => void)[] = [];
  const M = (c: number) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }); tozala.push(() => m.dispose()); return m; };
  const kiyim = M(0x2f6fb5), shim = M(0x2b2f3a), teri = M(0xd9a982), soch = M(0x2a1d14), oyoqKiyim = M(0x1a1a1a);
  const qism = (geo: THREE.BufferGeometry, m: THREE.Material, ota: THREE.Object3D, x: number, y: number, z: number) => {
    tozala.push(() => geo.dispose());
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = soya; ota.add(o); return o;
  };
  qism(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), kiyim, g, 0, 1.18, 0);
  qism(new THREE.SphereGeometry(0.11, 16, 12), teri, g, 0, 1.62, 0);
  qism(new THREE.SphereGeometry(0.112, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), soch, g, 0, 1.64, -0.01);
  const ayoq = (x: number) => {
    const j = new THREE.Group(); j.position.set(x, 0.92, 0); g.add(j);
    qism(new THREE.CapsuleGeometry(0.075, 0.68, 4, 8), shim, j, 0, -0.42, 0);
    qism(new THREE.BoxGeometry(0.11, 0.07, 0.24), oyoqKiyim, j, 0, -0.86, 0.05);
    return j;
  };
  const qol = (x: number) => {
    const j = new THREE.Group(); j.position.set(x, 1.4, 0); g.add(j);
    qism(new THREE.CapsuleGeometry(0.055, 0.5, 4, 8), kiyim, j, 0, -0.3, 0);
    qism(new THREE.SphereGeometry(0.05, 8, 6), teri, j, 0, -0.6, 0);
    return j;
  };
  const oyoqlar = [ayoq(0.1), ayoq(-0.1)], qollar = [qol(0.23), qol(-0.23)];
  return {
    guruh: g,
    yangila: (faza, yuryapti) => {
      const a = yuryapti ? Math.sin(faza) * 0.5 : 0;
      oyoqlar[0].rotation.x = a; oyoqlar[1].rotation.x = -a;
      qollar[0].rotation.x = -a * 0.8; qollar[1].rotation.x = a * 0.8;
      g.children[0].position.y = 1.18 + (yuryapti ? Math.abs(Math.cos(faza)) * 0.03 : 0);
    },
    dispose: () => tozala.forEach((f) => f()),
  };
}
