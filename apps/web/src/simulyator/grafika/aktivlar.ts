import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Tayyor 3D modellar (GLB, meshopt bilan siqilgan) va osmon (HDRI).
 * Manba: Poly Haven (CC0) — public/sim-teksturalar/MANBA.txt
 */
const ASOS = () => ((import.meta as any).env?.BASE_URL || '/') as string;

export type ModelNomi =
  | 'street_lamp_01' | 'modular_chainlink_fence' | 'concrete_road_barrier' | 'security_camera_01'
  | 'large_iron_gate' | 'modular_street_seating' | 'shrub_02';

let gltf: GLTFLoader | null = null;
const kesh = new Map<string, Promise<THREE.Object3D>>();

/** Modelni bir marta yuklaydi (keyingi chaqiruvlar keshdan). Geometriya/materiallar ilova davomida saqlanadi. */
export function modelYukla(nom: ModelNomi): Promise<THREE.Object3D> {
  if (!gltf) { gltf = new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder); }
  let p = kesh.get(nom);
  if (!p) {
    p = gltf.loadAsync(`${ASOS()}sim-modellar/${nom}.glb`).then((g) => {
      g.scene.updateMatrixWorld(true);
      g.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!m) return;
        // Shaffof (BLEND) materiallarni kesib ko'rsatishga o'tkazamiz: saralash muammosi yo'q, soya to'g'ri
        if (m.transparent) { m.transparent = false; m.alphaTest = 0.45; m.depthWrite = true; }
      });
      return g.scene;
    });
    kesh.set(nom, p);
  }
  return p;
}

let osmonP: Promise<THREE.DataTexture> | null = null;
export function osmonYukla(): Promise<THREE.DataTexture> {
  if (!osmonP) {
    osmonP = new HDRLoader().loadAsync(`${ASOS()}sim-osmon/osmon-2k.hdr`).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      return t;
    });
  }
  return osmonP;
}

/**
 * Osmon rasmidagi quyosh yo'nalishi (three koordinatalarida). HDRI tahlilidan:
 * eng yorug' piksel u = 0.595, balandlik 47.9° → atan2(z, x) = (u − 0.5)·2π.
 */
export const OSMON_QUYOSH = (() => {
  const a = (0.595 - 0.5) * 2 * Math.PI, h = THREE.MathUtils.degToRad(47.9);
  return new THREE.Vector3(Math.cos(a) * Math.cos(h), Math.sin(h), Math.sin(a) * Math.cos(h)).normalize();
})();

/** Model ichidagi meshlar (nom bo'yicha tanlab), har biri model ildiziga nisbatan matritsasi bilan.
 *  `tashla` — shu nomli materialli meshlar olinmaydi. */
export function meshlar(ildiz: THREE.Object3D, tanla?: (nom: string) => boolean, tashla?: string) {
  const out: { mesh: THREE.Mesh; mat: THREE.Matrix4 }[] = [];
  ildiz.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (tashla && (m.material as THREE.Material).name === tashla) return;
    if (tanla) {
      let n: THREE.Object3D | null = o, ok = false;
      while (n && n !== ildiz) { if (tanla(n.name)) { ok = true; break; } n = n.parent; }
      if (!ok) return;
    }
    out.push({ mesh: m, mat: m.matrixWorld.clone() });
  });
  return out;
}

/** Bitta model (yoki uning qismi) → ko'p nusxa: har mesh uchun bitta InstancedMesh */
export function nusxala(ildiz: THREE.Object3D, joylar: THREE.Matrix4[], soya: { tashla: boolean; qabul: boolean }, tanla?: (nom: string) => boolean, tashlaMat?: string) {
  const g = new THREE.Group();
  if (!joylar.length) return g;
  const t = new THREE.Matrix4();
  for (const { mesh, mat } of meshlar(ildiz, tanla, tashlaMat)) {
    const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, joylar.length);
    joylar.forEach((j, i) => im.setMatrixAt(i, t.multiplyMatrices(j, mat)));
    im.castShadow = soya.tashla; im.receiveShadow = soya.qabul;
    im.computeBoundingSphere();
    g.add(im);
  }
  return g;
}

/** Mesh qismining chegaraviy qutisi (ildiz koordinatalarida) */
export function quti(ildiz: THREE.Object3D, tanla?: (nom: string) => boolean) {
  const b = new THREE.Box3();
  for (const { mesh, mat } of meshlar(ildiz, tanla)) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    b.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mat));
  }
  return b;
}
