import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Mashina, type Kesma, type Kirish } from './mashina';
import { mashinaYasa, type MashinaModel } from './mashinaModel';
import { Imtihon, type Jarima, type Natija } from './imtihon';
import { MASHINA } from './sozlamalar';
import { engYaqin, maydonQur, siljigan, yonSiljish, type Maydon, type Namuna, type Nuqta } from './yol';

/** Ekrandagi tugmalar va klaviatura shu obyektni o'zgartiradi */
export interface Boshqaruv extends Kirish {
  kamar: boolean;
  chapChiroq: boolean;
  ongChiroq: boolean;
}

export interface HudMalumot {
  tezlik: number;
  uzatma: string;
  vaqt: number;
  jami: number;
  bosqich: string;
  korsatma: string;
  chiroqYonadi: boolean; // burilish ko'rsatkichi yonib-o'chishi (shu lahzada yoniqmi)
  rul: number;
  x: number;
  z: number;
  yaw: number;
}

export type KameraTuri = 'orqa' | 'tepa';

const FIZIKA_QADAM = 1 / 120;
const SARIQ_CHIZIQ = 0.3; // bordyurdan sariq chiziqgacha (chizma: 0,3 m)
const CHIZIQ_ENI = 0.1;

const fayl = (nom: string) => `${(import.meta as any).env?.BASE_URL || '/'}simulyator/${nom}`;

export class Dvigatel {
  readonly maydon: Maydon;
  private renderer: THREE.WebGLRenderer;
  private sahna = new THREE.Scene();
  private kamera: THREE.PerspectiveCamera;
  private quyosh: THREE.DirectionalLight;
  private model: MashinaModel;
  private mashina = new Mashina();
  private imtihon!: Imtihon;
  private chegaralar: Kesma[] = [];
  private indeks = 0;
  private oldIndeks = 0;
  private kameraTuri: KameraTuri = 'orqa';
  private kameraPoz = new THREE.Vector3();
  private kameraNishon = new THREE.Vector3();
  private oxirgi = 0;
  private yigindi = 0;
  private chiroqVaqt = 0;
  private kadr = 0;
  private toxtatildi = false;
  private olcham: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    readonly b: Boshqaruv,
    private chaqiruv: { onHud: (h: HudMalumot) => void; onJarima: (j: Jarima) => void; onTugadi: (n: Natija) => void },
  ) {
    const mobil = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 900;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobil ? 1.5 : 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // r187 da PCFSoft olib tashlangan; yumshoqlik — shadow.radius
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.kamera = new THREE.PerspectiveCamera(55, 1, 0.1, 4000);
    this.maydon = maydonQur();

    // ---- Osmon va yorug'lik ----
    const osmon = new Sky();
    osmon.scale.setScalar(1800);
    const u = osmon.material.uniforms;
    u.turbidity.value = 5; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
    // Quyosh oldinda-chapda: orqadan qaragan kameraga mashina hajmi (yorug'/soya) ko'rinadi
    const quyoshYon = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 34), THREE.MathUtils.degToRad(35));
    u.sunPosition.value.copy(quyoshYon);
    this.sahna.add(osmon);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const muhit = new THREE.Scene();
    const osmon2 = new Sky();
    osmon2.scale.setScalar(1800);
    Object.assign(osmon2.material.uniforms, THREE.UniformsUtils.clone(osmon.material.uniforms));
    osmon2.material.uniforms.sunPosition.value.copy(quyoshYon);
    muhit.add(osmon2);
    this.sahna.environment = pmrem.fromScene(muhit).texture;
    pmrem.dispose();
    this.sahna.fog = new THREE.FogExp2(0xcad9e6, 0.0032);

    this.sahna.add(new THREE.HemisphereLight(0xd6e8ff, 0x5d6e3e, 0.45));
    this.quyosh = new THREE.DirectionalLight(0xfff3e0, 2.1);
    this.quyosh.castShadow = true;
    this.quyosh.shadow.mapSize.set(mobil ? 1024 : 2048, mobil ? 1024 : 2048);
    const sc = this.quyosh.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 120;
    this.quyosh.shadow.bias = -0.0004;
    this.quyosh.shadow.radius = 3;
    this.quyosh.shadow.normalBias = 0.03;
    this.quyosh.userData.yon = quyoshYon.clone().multiplyScalar(60);
    this.sahna.add(this.quyosh, this.quyosh.target);

    this.yerQur();
    this.yolQur(this.maydon.namunalar);
    this.daraxtlarQur();

    this.model = mashinaYasa();
    this.sahna.add(this.model.guruh);

    this.qaytaBoshlash();

    this.olcham = new ResizeObserver(() => this.olchamlash());
    this.olcham.observe(canvas.parentElement || canvas);
    this.olchamlash();
    this.kadr = requestAnimationFrame(this.aylanish);
  }

  /* ---------------------------------- qurilish ---------------------------------- */

  private teksturaYukla(nom: string, takror: number, rang: boolean) {
    const t = new THREE.TextureLoader().load(fayl(nom));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(takror, takror);
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    if (rang) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private yerQur() {
    const m = new THREE.MeshStandardMaterial({
      map: this.teksturaYukla('ot-rang.jpg', 120, true),
      normalMap: this.teksturaYukla('ot-normal.jpg', 120, false),
      roughness: 0.95, color: 0xb9c99a,
    });
    const yer = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), m);
    yer.rotation.x = -Math.PI / 2;
    yer.position.set(5, -0.02, 30);
    yer.receiveShadow = true;
    this.sahna.add(yer);
  }

  /** Lenta (yo'l, chiziq): chap va o'ng chegara nuqtalaridan; uv — metrda */
  private lenta(chap: Nuqta[], ong: Nuqta[], y: number, uKenglik: number, vMasshtab: number, s: number[]) {
    const n = chap.length;
    const poz = new Float32Array(n * 2 * 3);
    const uv = new Float32Array(n * 2 * 2);
    const ind: number[] = [];
    for (let i = 0; i < n; i++) {
      poz.set([chap[i].x, y, chap[i].z, ong[i].x, y, ong[i].z], i * 6);
      uv.set([0, s[i] / vMasshtab, uKenglik, s[i] / vMasshtab], i * 4);
      if (i < n - 1) { const a = i * 2; ind.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(poz, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(ind);
    g.computeVertexNormals();
    // Yuqoriga qaragan bo'lishi kerak — aks holda tomonini almashtiramiz
    const nrm = g.getAttribute('normal');
    if (nrm.getY(0) < 0) { g.setIndex(ind.map((_, k) => ind[k - (k % 3) + [0, 2, 1][k % 3]])); g.computeVertexNormals(); }
    return g;
  }

  private yolQur(n: Namuna[]) {
    const s = n.map((x) => x.s);
    // Asfalt (bordyur ostigacha)
    const asfalt = new THREE.MeshStandardMaterial({
      map: this.teksturaYukla('asfalt-rang.jpg', 1, true),
      normalMap: this.teksturaYukla('asfalt-normal.jpg', 1, false),
      // G'adir-budurlik xaritasi quyosh oldinda bo'lganda asfaltni "muz"dek yaltiratardi — bir xil xira
      roughness: 0.96, metalness: 0, color: 0x8a8781, envMapIntensity: 0.25,
    });
    const chet = 0.6;
    const yol = new THREE.Mesh(
      this.lenta(siljigan(n, (x) => x.eni / 2 + chet), siljigan(n, (x) => -x.eni / 2 - chet), 0, (4.5 + 2 * chet) / 3.5, 3.5, s),
      asfalt,
    );
    yol.receiveShadow = true;
    this.sahna.add(yol);

    // Sariq chegara chiziqlari (1.4) — bordyurdan 0,3 m ichkarida
    const sariq = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const t of [1, -1]) {
      const d = (x: Namuna) => t * (x.eni / 2 - SARIQ_CHIZIQ);
      const g = this.lenta(siljigan(n, (x) => d(x) + CHIZIQ_ENI / 2), siljigan(n, (x) => d(x) - CHIZIQ_ENI / 2), 0.004, 1, 1, s);
      const m = new THREE.Mesh(g, sariq);
      m.receiveShadow = true;
      this.sahna.add(m);
    }

    // Bordyurlar (oq-qora) va to'qnashuv chegaralari
    const oq = new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.75 });
    const qora = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.8 });
    const boyi = 0.18, eni = 0.18;
    const qism = new THREE.BoxGeometry(eni, boyi, 0.98);
    const joylar: { p: Nuqta; yaw: number }[] = [];
    for (const t of [1, -1]) {
      const chiziq = siljigan(n, (x) => t * (x.eni / 2 + eni / 2));
      const ichki = siljigan(n, (x) => t * (x.eni / 2));
      for (let i = 0; i < ichki.length - 1; i++) this.chegaralar.push({ a: ichki[i], b: ichki[i + 1] });
      // Har 1 m da bitta bo'lak
      let qoldiq = 0;
      for (let i = 0; i < chiziq.length - 1; i++) {
        const a = chiziq[i], c = chiziq[i + 1];
        const uz = Math.hypot(c.x - a.x, c.z - a.z);
        qoldiq += uz;
        if (qoldiq >= 1) {
          qoldiq -= 1;
          const k = Math.max(0, i - 3);
          const p0 = chiziq[k], p1 = chiziq[i + 1];
          joylar.push({ p: { x: (p0.x + p1.x) / 2, z: (p0.z + p1.z) / 2 }, yaw: Math.atan2(p1.x - p0.x, p1.z - p0.z) });
        }
      }
    }
    // Boshi va oxiri yopiq (orqada va to'xtash joyidan keyin)
    for (const nn of [n[0], n[n.length - 1]]) {
      const a = { x: nn.x + Math.cos(nn.yaw) * (nn.eni / 2), z: nn.z - Math.sin(nn.yaw) * (nn.eni / 2) };
      const c = { x: nn.x - Math.cos(nn.yaw) * (nn.eni / 2), z: nn.z + Math.sin(nn.yaw) * (nn.eni / 2) };
      this.chegaralar.push({ a, b: c });
      const qadamlar = Math.ceil(nn.eni);
      for (let k = 0; k < qadamlar; k++) {
        const t = (k + 0.5) / qadamlar;
        joylar.push({ p: { x: a.x + (c.x - a.x) * t, z: a.z + (c.z - a.z) * t }, yaw: nn.yaw + Math.PI / 2 });
      }
    }
    const matritsa = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const oqlar = new THREE.InstancedMesh(qism, oq, Math.ceil(joylar.length / 2));
    const qoralar = new THREE.InstancedMesh(qism, qora, Math.ceil(joylar.length / 2));
    let io = 0, iq = 0;
    joylar.forEach((j, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), j.yaw);
      matritsa.compose(new THREE.Vector3(j.p.x, boyi / 2, j.p.z), q, new THREE.Vector3(1, 1, 1));
      if (i % 2 === 0) oqlar.setMatrixAt(io++, matritsa); else qoralar.setMatrixAt(iq++, matritsa);
    });
    oqlar.count = io; qoralar.count = iq;
    for (const m of [oqlar, qoralar]) { m.castShadow = true; m.receiveShadow = true; this.sahna.add(m); }

    // Ko'ndalang chiziqlar va yozuvlar
    const S = this.maydon.s;
    const oqBoyoq = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 });
    const sariqBoyoq = sariq;
    this.kondalang(S.start, 0.4, oqBoyoq, false);
    this.kondalang(S.startOxiri, 0.1, sariqBoyoq, true);
    this.kondalang(S.ilonBosh, 0.1, sariqBoyoq, true);
    this.kondalang(S.ilonOxir, 0.1, sariqBoyoq, true);
    this.kondalang(S.finish, 0.4, oqBoyoq, false);
    this.yozuv('START', S.start + 1.6);
    this.yozuv('FINISH', S.finish + 1.6);
    this.belgi20(S.belgi20);
  }

  private namunaS(s: number): Namuna {
    const n = this.maydon.namunalar;
    return n[Math.max(0, Math.min(n.length - 1, Math.round(s / 0.25)))];
  }

  /** Yo'lni ko'ndalang kesuvchi chiziq (START, FINISH, mashq chegarasi — uzuq-uzuq) */
  private kondalang(s: number, kenglik: number, m: THREE.Material, uzuq: boolean) {
    const n = this.namunaS(s);
    const eni = n.eni - 0.02;
    const bolaklar = uzuq ? Math.round(eni / 0.5) : 1;
    for (let i = 0; i < bolaklar; i++) {
      const uz = uzuq ? 0.3 : eni;
      const g = new THREE.PlaneGeometry(uz, kenglik);
      g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, m);
      const yon = uzuq ? -eni / 2 + (i + 0.5) * (eni / bolaklar) : 0;
      mesh.position.set(n.x + Math.cos(n.yaw) * yon, 0.006, n.z - Math.sin(n.yaw) * yon);
      mesh.rotation.y = n.yaw;
      mesh.receiveShadow = true;
      this.sahna.add(mesh);
    }
  }

  /** Yo'lga yozilgan so'z (haydovchi tomonidan o'qiladi) */
  private yozuv(matn: string, s: number) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 160;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#f2f2ee'; c.font = 'bold 150px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(matn, 256, 86);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const g = new THREE.PlaneGeometry(2.4, 0.75);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI);
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 }));
    const n = this.namunaS(s);
    mesh.position.set(n.x, 0.007, n.z);
    mesh.rotation.y = n.yaw;
    mesh.receiveShadow = true;
    this.sahna.add(mesh);
  }

  /** 3.24 "Yuqori tezlik cheklangan" — 20 km/soat, yo'lning o'ng tomonida */
  private belgi20(s: number) {
    const n = this.namunaS(s);
    const yon = -(n.eni / 2 + 0.8);
    const x = n.x + Math.cos(n.yaw) * yon, z = n.z - Math.sin(n.yaw) * yon;
    const ustun = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 10), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 }));
    ustun.position.set(x, 1.15, z);
    ustun.castShadow = true;
    this.sahna.add(ustun);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 124, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d6151b'; c.lineWidth = 34; c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#111'; c.font = 'bold 120px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('20', 128, 134);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    const doira = new THREE.Mesh(new THREE.CircleGeometry(0.35, 40), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
    doira.position.set(x, 2.05, z);
    doira.rotation.y = n.yaw + Math.PI; // kelayotgan haydovchiga qaraydi
    doira.castShadow = true;
    this.sahna.add(doira);
    const orqa = new THREE.Mesh(new THREE.CircleGeometry(0.35, 40), new THREE.MeshStandardMaterial({ color: 0x8d949c, metalness: 0.7, roughness: 0.4 }));
    orqa.position.copy(doira.position);
    orqa.rotation.y = n.yaw;
    this.sahna.add(orqa);
  }

  private daraxtlarQur() {
    const n = this.maydon.namunalar;
    const markaz = n.reduce((a, b) => ({ x: a.x + b.x / n.length, z: a.z + b.z / n.length }), { x: 0, z: 0 });
    const joylar: Nuqta[] = [];
    let urinish = 0;
    let urug = 7;
    const tasodif = () => { urug = (urug * 16807) % 2147483647; return urug / 2147483647; };
    while (joylar.length < 140 && urinish++ < 4000) {
      const a = tasodif() * Math.PI * 2, r = 22 + tasodif() * 90;
      const p = { x: markaz.x + Math.cos(a) * r, z: markaz.z + Math.sin(a) * r };
      if (n.some((x) => (x.x - p.x) ** 2 + (x.z - p.z) ** 2 < 100)) continue;
      joylar.push(p);
    }
    const tanaG = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 7);
    const bargG = new THREE.ConeGeometry(1.5, 3.6, 8);
    const tanaM = new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 0.9 });
    const bargM = new THREE.MeshStandardMaterial({ color: 0x2f5a2c, roughness: 0.85 });
    const tanalar = new THREE.InstancedMesh(tanaG, tanaM, joylar.length);
    const barglar = new THREE.InstancedMesh(bargG, bargM, joylar.length * 2);
    const m = new THREE.Matrix4();
    joylar.forEach((p, i) => {
      const k = 0.8 + tasodif() * 0.7;
      m.makeScale(k, k, k).setPosition(p.x, 0.8 * k, p.z);
      tanalar.setMatrixAt(i, m);
      m.makeScale(k, k, k).setPosition(p.x, 2.6 * k, p.z);
      barglar.setMatrixAt(i * 2, m);
      m.makeScale(k * 0.75, k * 0.8, k * 0.75).setPosition(p.x, 4.1 * k, p.z);
      barglar.setMatrixAt(i * 2 + 1, m);
    });
    for (const x of [tanalar, barglar]) { x.castShadow = true; x.receiveShadow = true; this.sahna.add(x); }
  }

  /* ----------------------------------- boshqaruv ----------------------------------- */

  qaytaBoshlash() {
    const b = this.maydon.boshlash;
    this.mashina.joyla(b.x, b.z, b.yaw);
    Object.assign(this.b, { gaz: 0, tormoz: 0, rul: 0, rulUshlangan: false, uzatma: 'N', qolTormoz: true, kamar: false, chapChiroq: false, ongChiroq: false });
    this.imtihon = new Imtihon(this.maydon);
    this.imtihon.onJarima = this.chaqiruv.onJarima;
    this.imtihon.onTugadi = this.chaqiruv.onTugadi;
    this.indeks = 0;
    this.oldIndeks = 0;
    this.kameraniJoyla(true);
  }

  kameraAlmashtir() {
    this.kameraTuri = this.kameraTuri === 'orqa' ? 'tepa' : 'orqa';
    this.kameraniJoyla(true);
  }

  private olchamlash() {
    const el = this.canvas.parentElement || this.canvas;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.kamera.aspect = w / h;
    this.kamera.fov = w / h < 1 ? 70 : 55;
    this.kamera.updateProjectionMatrix();
  }

  /* -------------------------------------- tsikl -------------------------------------- */

  private aylanish = (t: number) => {
    if (this.toxtatildi) return;
    this.kadr = requestAnimationFrame(this.aylanish);
    const dt = this.oxirgi ? Math.min(0.1, (t - this.oxirgi) / 1000) : 0;
    this.oxirgi = t;
    this.yigindi += dt;
    while (this.yigindi >= FIZIKA_QADAM) {
      this.fizika(FIZIKA_QADAM);
      this.yigindi -= FIZIKA_QADAM;
    }
    this.korinish(dt);
    this.renderer.render(this.sahna, this.kamera);
  };

  private fizika(dt: number) {
    const m = this.mashina;
    const tugadi = this.imtihon.bosqich === 'tugadi';
    // Imtihon tugagach mashina to'xtaydi (boshqaruv o'chadi)
    const k: Kirish = tugadi ? { ...this.b, gaz: 0, tormoz: 1 } : this.b;
    m.qadam(dt, k, this.chegaralar);
    if (!tugadi) this.b.rul = k.rul; // o'zi markazga qaytgan rul

    const n = this.maydon.namunalar;
    const mk = m.markaz;
    this.indeks = engYaqin(n, mk, this.indeks);
    const oldNuqta = { x: m.x + Math.sin(m.yaw) * (MASHINA.bazasi + MASHINA.oldiOsilma), z: m.z + Math.cos(m.yaw) * (MASHINA.bazasi + MASHINA.oldiOsilma) };
    this.oldIndeks = engYaqin(n, oldNuqta, this.oldIndeks);
    // G'ildirak sariq chiziqni bosdimi: g'ildirak (eni ~0,2 m) chiziq ichki qirrasidan o'tdi
    let chiziqda = false;
    for (const g of m.gildiraklar()) {
      const ni = n[engYaqin(n, g, this.indeks)];
      if (Math.abs(yonSiljish(ni, g)) + 0.1 > ni.eni / 2 - SARIQ_CHIZIQ - CHIZIQ_ENI / 2) { chiziqda = true; break; }
    }
    this.imtihon.qadam(dt, {
      s: n[this.indeks].s,
      sOld: n[this.oldIndeks].s,
      tezlikKmh: m.tezlikKmh,
      v: m.v,
      kamar: this.b.kamar,
      chapChiroq: this.b.chapChiroq,
      urildi: m.urildi,
      chiziqda,
    });
  }

  private korinish(dt: number) {
    const m = this.mashina;
    const md = this.model;
    md.guruh.position.set(m.x, 0, m.z);
    md.guruh.rotation.y = m.yaw;
    for (const p of md.oldGildiraklar) p.rotation.y = m.delta;
    for (const g of md.gildiraklar) g.rotation.x = m.gildirakAylanish / MASHINA.gildirakR;

    // Burilish ko'rsatkichlari (1,5 Hz), tormoz chirog'i
    this.chiroqVaqt += dt;
    const yonadi = this.chiroqVaqt % 0.66 < 0.36;
    md.chapChiroqlar.emissiveIntensity = this.b.chapChiroq && yonadi ? 3 : 0;
    md.ongChiroqlar.emissiveIntensity = this.b.ongChiroq && yonadi ? 3 : 0;
    md.tormozChiroq.emissiveIntensity = this.b.tormoz > 0.05 || this.imtihon.bosqich === 'tugadi' ? 2.5 : 0;

    // Quyosh soyasi mashina atrofida
    const q = this.quyosh;
    q.target.position.set(m.x, 0, m.z);
    q.position.copy(q.target.position).add(q.userData.yon as THREE.Vector3);

    this.kameraniJoyla(false, dt);

    this.chaqiruv.onHud({
      tezlik: m.tezlikKmh,
      uzatma: this.b.uzatma,
      vaqt: this.imtihon.vaqt,
      jami: this.imtihon.jami,
      bosqich: this.imtihon.bosqichNomi,
      korsatma: this.imtihon.korsatma,
      chiroqYonadi: yonadi,
      rul: this.b.rul,
      x: m.x,
      z: m.z,
      yaw: m.yaw,
    });
  }

  private kameraniJoyla(darhol: boolean, dt = 0) {
    const m = this.mashina;
    const s = Math.sin(m.yaw), c = Math.cos(m.yaw);
    const mk = m.markaz;
    const poz = new THREE.Vector3();
    const nishon = new THREE.Vector3();
    if (this.kameraTuri === 'orqa') {
      poz.set(mk.x - s * 7.2, 3.1, mk.z - c * 7.2);
      nishon.set(mk.x + s * 4, 0.9, mk.z + c * 4);
    } else {
      poz.set(mk.x - s * 3.5, 15, mk.z - c * 3.5);
      nishon.set(mk.x + s * 1.5, 0, mk.z + c * 1.5);
    }
    if (darhol) {
      this.kameraPoz.copy(poz);
      this.kameraNishon.copy(nishon);
    } else {
      const k = 1 - Math.exp(-dt * 4.5);
      this.kameraPoz.lerp(poz, k);
      this.kameraNishon.lerp(nishon, 1 - Math.exp(-dt * 8));
    }
    this.kamera.position.copy(this.kameraPoz);
    this.kamera.lookAt(this.kameraNishon);
  }

  dispose() {
    this.toxtatildi = true;
    cancelAnimationFrame(this.kadr);
    this.olcham.disconnect();
    this.sahna.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) {
        for (const v of Object.values(x)) if (v instanceof THREE.Texture) v.dispose();
        x.dispose();
      }
    });
    (this.sahna.environment as THREE.Texture | null)?.dispose();
    this.renderer.dispose();
  }
}
