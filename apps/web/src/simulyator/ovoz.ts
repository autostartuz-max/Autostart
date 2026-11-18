/** Simulyator ovozlari — WebAudio bilan sintez (fayl kerak emas) */
export class Ovoz {
  private ctx: AudioContext | null = null;
  private dv: { o1: OscillatorNode; o2: OscillatorNode; f: BiquadFilterNode; g: GainNode } | null = null;
  private signalG: GainNode | null = null;
  private asosiy: GainNode | null = null;
  yoqilgan = true;

  /** Foydalanuvchi bosganda chaqiriladi (brauzer talabi) */
  boshla() {
    if (this.ctx || !this.yoqilgan) return;
    try {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new C();
      this.ctx = ctx;
      const asosiy = ctx.createGain(); asosiy.gain.value = 0.9; asosiy.connect(ctx.destination); this.asosiy = asosiy;
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
      const o2 = ctx.createOscillator(); o2.type = 'square';
      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
      const g = ctx.createGain(); g.gain.value = 0;
      o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(asosiy);
      o1.start(); o2.start();
      this.dv = { o1, o2, f, g };
      const so = ctx.createOscillator(); so.type = 'square'; so.frequency.value = 1900;
      const sg = ctx.createGain(); sg.gain.value = 0;
      so.connect(sg); sg.connect(asosiy); so.start();
      this.signalG = sg;
    } catch { this.ctx = null; }
  }

  dvigatel(ayl: number, gaz: number, ishlayapti: boolean) {
    const d = this.dv, ctx = this.ctx;
    if (!d || !ctx) return;
    const t = ctx.currentTime;
    const f = Math.max(20, (ayl / 60) * 2); // 4 silindr: aylanishiga 2 ta yonish
    d.o1.frequency.setTargetAtTime(f, t, 0.05);
    d.o2.frequency.setTargetAtTime(f * 2, t, 0.05);
    d.f.frequency.setTargetAtTime(220 + f * 5 + gaz * 600, t, 0.08);
    d.g.gain.setTargetAtTime(ishlayapti && this.yoqilgan ? 0.05 + gaz * 0.07 + Math.min(1, ayl / 6000) * 0.05 : 0, t, 0.08);
  }

  private zarbaTovush(chastota: number, davom: number, tur: OscillatorType, baland: number) {
    const ctx = this.ctx;
    if (!ctx || !this.asosiy || !this.yoqilgan) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = tur; o.frequency.value = chastota;
    const g = ctx.createGain();
    g.gain.setValueAtTime(baland, t); g.gain.exponentialRampToValueAtTime(0.0005, t + davom);
    o.connect(g); g.connect(this.asosiy);
    o.start(t); o.stop(t + davom + 0.02);
  }

  /** Burilish ko'rsatkichi "chiq" */
  chiqillash(yuqori: boolean) { this.zarbaTovush(yuqori ? 1700 : 1300, 0.03, 'square', 0.05); }
  /** Jarima ogohlantirishi */
  jarima() { this.zarbaTovush(240, 0.35, 'square', 0.12); }
  /** Urilish */
  zarba() { this.zarbaTovush(70, 0.25, 'sine', 0.5); }
  /** Avariya signal qurilmasi (yonib-o'chadi) */
  signal(yoniq: boolean) {
    if (!this.ctx || !this.signalG) return;
    this.signalG.gain.setTargetAtTime(yoniq && this.yoqilgan ? 0.05 : 0, this.ctx.currentTime, 0.01);
  }
  /** Muvaffaqiyat */
  yaxshi() { this.zarbaTovush(880, 0.18, 'sine', 0.08); setTimeout(() => this.zarbaTovush(1320, 0.25, 'sine', 0.08), 120); }

  pauza(t: boolean) { if (!this.ctx) return; void (t ? this.ctx.suspend() : this.ctx.resume()).catch(() => {}); }
  ovozQoy(y: boolean) { this.yoqilgan = y; if (!y) { this.dvigatel(0, 0, false); this.signal(false); } }
  dispose() { void this.ctx?.close().catch(() => {}); this.ctx = null; this.dv = null; }
}
