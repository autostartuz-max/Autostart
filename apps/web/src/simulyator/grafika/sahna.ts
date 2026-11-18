import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { Maydon } from '../dunyo/turlar';
import type { FizikDunyo } from '../fizika/dunyo';
import type { Mashina, Boshqaruv } from '../fizika/mashina';
import type { Hakam, Panel } from '../imtihon/hakam';
import type { MashinaTuri } from '../mashinalar';
import { maydonModel, type MaydonModel } from './maydonModel';
import { atrofModel, type AtrofModel } from './atrof';
import { mashinaModel, type MashinaModel } from './mashinaModel';
import { odamModel, type OdamModel } from './odam';

export type KameraRejim = 'orqa' | 'salon' | 'old' | 'tepa';
export const KAMERALAR: KameraRejim[] = ['orqa', 'salon', 'old', 'tepa'];
export type Sifat = 0 | 1 | 2;

/** Dunyo (x, y) → three (x, h, -y); mashina yo'nalishi th → rotation.y = th + PI/2 */
const yawGa = (th: number) => th + Math.PI / 2;

export class Grafika {
  readonly renderer: THREE.WebGLRenderer;
  readonly sahna = new THREE.Scene();
  readonly kamera: THREE.PerspectiveCamera;
  kameraRejim: KameraRejim = 'orqa';
  /** Sinov uchun (faqat dev): kamera qo'lda beriladi */
  erkin: { poz: THREE.Vector3; nishon: THREE.Vector3 } | null = null;
  sifat: Sifat;
  private quyosh: THREE.DirectionalLight;
  private quyoshYon: THREE.Vector3;
  private maydonM: MaydonModel;
  private atrofM: AtrofModel;
  private mashinaM: MashinaModel;
  private odamM: OdamModel;
  private kPoz = new THREE.Vector3();
  private kNishon = new THREE.Vector3();
  private kYaw = 0;
  private boshlandi = false;
  private vaqt = 0;
  private kadrlar: number[] = [];
  private olcham: ResizeObserver;
  private tmp = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement, readonly m: Maydon, readonly d: FizikDunyo, readonly turi: MashinaTuri, rang: string, sifat: Sifat) {
    this.sifat = sifat;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: sifat > 0, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = sifat > 0;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pikselNisbat();
    this.kamera = new THREE.PerspectiveCamera(58, 1, 0.08, 2500);
    const soya = sifat > 0;

    // Osmon va muhit yorug'ligi
    const osmon = new Sky();
    osmon.scale.setScalar(2000);
    const u = osmon.material.uniforms;
    u.turbidity.value = 4.5; u.rayleigh.value = 1.3; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
    this.quyoshYon = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(150));
    u.sunPosition.value.copy(this.quyoshYon);
    this.sahna.add(osmon);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const muhit = new THREE.Scene();
    const o2 = new Sky(); o2.scale.setScalar(2000);
    Object.assign(o2.material.uniforms, THREE.UniformsUtils.clone(osmon.material.uniforms));
    o2.material.uniforms.sunPosition.value.copy(this.quyoshYon);
    muhit.add(o2);
    this.sahna.environment = pmrem.fromScene(muhit).texture;
    pmrem.dispose();
    this.sahna.fog = new THREE.Fog(0xc8d6e2, 160, 900);
    this.sahna.add(new THREE.HemisphereLight(0xdbe9ff, 0x5f6e44, 0.55));
    this.quyosh = new THREE.DirectionalLight(0xfff1dc, 2.4);
    this.quyosh.castShadow = soya;
    const ms = sifat === 2 ? 2048 : 1024;
    this.quyosh.shadow.mapSize.set(ms, ms);
    const sc = this.quyosh.shadow.camera;
    sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 160;
    this.quyosh.shadow.bias = -0.0003;
    this.quyosh.shadow.normalBias = 0.04;
    this.quyosh.shadow.radius = 2.5;
    this.sahna.add(this.quyosh, this.quyosh.target);

    const aniz = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.maydonM = maydonModel(m, d, aniz, soya);
    this.sahna.add(this.maydonM.guruh);
    this.atrofM = atrofModel(m, sifat, soya);
    this.sahna.add(this.atrofM.guruh);
    this.mashinaM = mashinaModel(turi, rang, soya);
    this.sahna.add(this.mashinaM.guruh);
    this.odamM = odamModel(soya);
    this.odamM.guruh.visible = false;
    this.sahna.add(this.odamM.guruh);

    this.olcham = new ResizeObserver(() => this.olchamlash());
    this.olcham.observe(canvas.parentElement || canvas);
    this.olchamlash();
  }

  private pikselNisbat() {
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(dpr, [1, 1.5, 2][this.sifat]));
  }

  olchamlash() {
    const el = this.canvas.parentElement || this.canvas;
    const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.kamera.aspect = w / Math.max(1, h);
    this.kamera.updateProjectionMatrix();
  }

  kameraAlmashtir(r?: KameraRejim) {
    this.kameraRejim = r ?? KAMERALAR[(KAMERALAR.indexOf(this.kameraRejim) + 1) % KAMERALAR.length];
    this.boshlandi = false; // yangi joyga darhol o'tadi
  }

  rangQoy(rang: string) { this.mashinaM.rangQoy(rang); }

  /** Bir kadr: modellar holatini yangilash va chizish */
  chiz(dt: number, mash: Mashina, k: Boshqaruv, pnl: Panel, hk: Hakam) {
    this.vaqt += dt;
    const t = this.turi, mm = this.mashinaM;
    // ── Mashina joyi va og'ishi
    const c = mash.markaz;
    mm.guruh.position.set(c.x, mash.balandlik, -c.y);
    mm.guruh.rotation.set(-mash.yerPitch, yawGa(mash.th), mash.yerRoll, 'YXZ');
    mm.kuzov.rotation.set(-mash.dinPitch, 0, mash.dinRoll, 'YXZ');
    mm.kuzov.position.y = -Math.abs(mash.dinPitch) * 0.4;
    // G'ildiraklar: Ackermann burilish, aylanish
    const dl = mash.delta;
    let dChap = dl, dOng = dl;
    if (Math.abs(dl) > 1e-4) {
      const Rr = t.bazasi / Math.tan(Math.abs(dl));
      const ich = Math.atan(t.bazasi / Math.max(0.5, Rr - t.koleya / 2)), tash = Math.atan(t.bazasi / (Rr + t.koleya / 2));
      if (dl > 0) { dChap = ich; dOng = tash; } else { dChap = -tash; dOng = -ich; }
    }
    for (const g of mm.gildiraklar) {
      if (g.old) g.burilish.rotation.y = g.chap ? dChap : dOng;
      g.aylanish.rotation.x = mash.gildirakBurchak;
    }
    mm.rul.rotation.z = -(k.rul * Math.PI) / 180;
    // ── Chiroqlar
    const miltilla = Math.floor(this.vaqt * 3) % 2 === 0; // 1,5 Hz
    const ch = mm.chiroq;
    ch.far.emissiveIntensity = pnl.faralar ? 1.8 : 0.06;
    ch.gabarit.emissiveIntensity = pnl.faralar ? 0.9 : 0.12;
    ch.tormoz.emissiveIntensity = k.tormoz > 0.05 ? 2.6 : pnl.faralar ? 0.35 : 0.05;
    ch.orqaYurish.emissiveIntensity = k.uzatma === 'R' ? 1.8 : 0;
    ch.chap.emissiveIntensity = (pnl.chapChiroq || pnl.avariyaChiroq) && miltilla ? 3 : 0;
    ch.ong.emissiveIntensity = (pnl.ongChiroq || pnl.avariyaChiroq) && miltilla ? 3 : 0;
    mm.salon.visible = this.kameraRejim === 'salon' || this.sifat > 0;
    // ── Svetoforlar
    for (const [id, s] of this.maydonM.svetoforlar) {
      const i = hk.sv.ishora(id);
      const yongan = (x: boolean) => (x ? 3.2 : 0.05);
      s.qizil.emissiveIntensity = yongan(i === 'qizil' || i === 'qizilSariq');
      s.sariq.emissiveIntensity = yongan(i === 'sariq' || i === 'qizilSariq');
      s.yashil.emissiveIntensity = yongan(i === 'yashil' || (i === 'miltillash' && Math.floor(this.vaqt * 2) % 2 === 0));
    }
    this.maydonM.avariyaChiroq.emissiveIntensity = hk.avariyaSignal && Math.floor(this.vaqt * 4) % 2 === 0 ? 5 : 0.04;
    // ── Piyoda
    const pd = hk.piyoda;
    this.odamM.guruh.visible = pd.holat !== 'yoq';
    if (pd.holat !== 'yoq') {
      this.odamM.guruh.position.set(pd.p.x, 0.12, -pd.p.y);
      this.odamM.guruh.rotation.y = Math.atan2(Math.cos(pd.th), -Math.sin(pd.th));
      this.odamM.yangila(pd.faza, pd.holat === 'otyapti');
    }
    // ── Kamera va quyosh
    this.kameraYangila(dt, mash, k);
    this.tmp.set(c.x, 0, -c.y);
    this.quyosh.position.copy(this.tmp).addScaledVector(this.quyoshYon, 80);
    this.quyosh.target.position.copy(this.tmp);
    this.renderer.render(this.sahna, this.kamera);
    this.fpsKuzat(dt);
  }

  private kameraYangila(dt: number, mash: Mashina, k: Boshqaruv) {
    const c = mash.markaz, cam = this.kamera;
    if (this.erkin) { cam.position.copy(this.erkin.poz); cam.up.set(0, 1, 0); cam.lookAt(this.erkin.nishon); this.fovQoy(45); return; }
    const yaw = mash.th;
    if (!this.boshlandi) this.kYaw = yaw;
    // Yo'nalish kechikish bilan ergashadi (silliq)
    const fark = Math.atan2(Math.sin(yaw - this.kYaw), Math.cos(yaw - this.kYaw));
    this.kYaw += fark * Math.min(1, dt * (this.kameraRejim === 'orqa' ? 3.2 : 8));
    const f = { x: Math.cos(this.kYaw), y: Math.sin(this.kYaw) };
    const h = mash.balandlik;
    let poz: THREE.Vector3, nishon: THREE.Vector3;
    let fov = 58;
    switch (this.kameraRejim) {
      case 'salon': {
        const mm = this.mashinaM;
        mm.guruh.updateMatrixWorld(true);
        poz = mm.kuzov.localToWorld(mm.koz.clone());
        const qarash = (-k.rul / 540) * 0.45; // burilishda bosh rul tomonga biroz buriladi
        const d = new THREE.Vector3(Math.sin(qarash), -0.13, Math.cos(qarash)).applyQuaternion(mm.kuzov.getWorldQuaternion(new THREE.Quaternion()));
        nishon = poz.clone().add(d);
        fov = 72;
        cam.position.copy(poz); cam.lookAt(nishon); cam.up.set(0, 1, 0);
        this.kPoz.copy(poz); this.kNishon.copy(nishon);
        this.fovQoy(fov);
        this.boshlandi = true;
        return;
      }
      case 'old': {
        const L = this.turi.uzunlik / 2 + 0.25;
        poz = new THREE.Vector3(c.x + Math.cos(yaw) * L, h + 0.95, -(c.y + Math.sin(yaw) * L));
        nishon = new THREE.Vector3(c.x + Math.cos(yaw) * (L + 8), h + 0.1, -(c.y + Math.sin(yaw) * (L + 8)));
        fov = 70;
        break;
      }
      case 'tepa': {
        poz = new THREE.Vector3(c.x - f.x * 3, h + 21, -(c.y - f.y * 3));
        nishon = new THREE.Vector3(c.x + f.x * 1.5, h, -(c.y + f.y * 1.5));
        fov = 50;
        break;
      }
      default: {
        const orqa = 6.4, bal = 2.5;
        poz = new THREE.Vector3(c.x - f.x * orqa, h + bal, -(c.y - f.y * orqa));
        nishon = new THREE.Vector3(c.x + f.x * 2.6, h + 0.95, -(c.y + f.y * 2.6));
      }
    }
    if (!this.boshlandi) { this.kPoz.copy(poz); this.kNishon.copy(nishon); this.boshlandi = true; }
    const a = Math.min(1, dt * (this.kameraRejim === 'old' ? 30 : 7));
    this.kPoz.lerp(poz, a);
    this.kNishon.lerp(nishon, Math.min(1, dt * 12));
    cam.position.copy(this.kPoz);
    if (this.kameraRejim === 'tepa') cam.up.set(f.x, 0, -f.y); else cam.up.set(0, 1, 0);
    cam.lookAt(this.kNishon);
    this.fovQoy(fov);
  }

  private fovQoy(fov: number) {
    if (Math.abs(this.kamera.fov - fov) > 0.01) { this.kamera.fov += (fov - this.kamera.fov) * 0.25; this.kamera.updateProjectionMatrix(); }
  }

  /** Kadr tezligi past bo'lsa — sifatni pasaytirish (piksel nisbati, soyalar) */
  private fpsKuzat(dt: number) {
    this.kadrlar.push(dt);
    if (this.kadrlar.length < 90) return;
    const ortacha = this.kadrlar.reduce((a, b) => a + b, 0) / this.kadrlar.length;
    this.kadrlar = [];
    if (ortacha > 1 / 28 && this.sifat > 0) {
      this.sifat = (this.sifat - 1) as Sifat;
      this.pikselNisbat();
      if (this.sifat === 0) { this.renderer.shadowMap.enabled = false; this.quyosh.castShadow = false; }
      this.olchamlash();
    }
  }

  dispose() {
    this.olcham.disconnect();
    this.maydonM.dispose(); this.atrofM.dispose(); this.mashinaM.dispose(); this.odamM.dispose();
    this.sahna.environment?.dispose();
    this.renderer.dispose();
  }
}
