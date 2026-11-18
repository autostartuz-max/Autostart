import * as THREE from 'three';

const ASOS = () => ((import.meta as any).env?.BASE_URL || '/') as string;
export const simFayl = (nom: string) => `${ASOS()}sim-teksturalar/${nom}`;
export const belgiFayl = (kod: string) => `${ASOS()}belgi-rasm/${kod}.svg`;

/** Takrorlanuvchi rasm tekstura (asfalt, o't) */
export function teksturaYukla(url: string, takror: number, rang: boolean, anizotropiya: number) {
  const t = new THREE.TextureLoader().load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(takror, takror);
  t.anisotropy = anizotropiya;
  if (rang) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function kanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
}

function kanvasTekstura(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Tezlik cheklovi (3.24 — qizil halqa) yoki eng kam tezlik (4.6 — ko'k doira) belgisi */
function tezlikBelgisi(son: string, eng: boolean) {
  const { c, g } = kanvas(256, 256);
  g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2);
  if (eng) {
    g.fillStyle = '#1f5fbf'; g.fill();
    g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff';
  } else {
    g.fillStyle = '#fff'; g.fill();
    g.lineWidth = 30; g.strokeStyle = '#d7191c'; g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#111';
  }
  g.font = 'bold 118px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(son, 128, 136);
  return kanvasTekstura(c);
}

const belgiKesh = new Map<string, THREE.Texture>();

/**
 * Yo'l belgisi teksturasi. kod: '1.14', '2.5' (katalogdagi rasm) yoki 'tezlik:20', 'eng:20'.
 * Rasm yuklanguncha shaffof kanvas ko'rinadi, keyin yangilanadi.
 */
export function belgiTekstura(kod: string): THREE.Texture {
  const bor = belgiKesh.get(kod);
  if (bor) return bor;
  let t: THREE.Texture;
  if (kod.startsWith('tezlik:') || kod.startsWith('eng:')) {
    t = tezlikBelgisi(kod.split(':')[1], kod.startsWith('eng:'));
  } else {
    const { c, g } = kanvas(256, 256);
    t = kanvasTekstura(c);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(256 / (img.naturalWidth || 256), 256 / (img.naturalHeight || 256));
      const w = (img.naturalWidth || 256) * k, h = (img.naturalHeight || 256) * k;
      g.clearRect(0, 0, 256, 256);
      g.drawImage(img, (256 - w) / 2, (256 - h) / 2, w, h);
      t.needsUpdate = true;
    };
    img.src = belgiFayl(kod);
  }
  belgiKesh.set(kod, t);
  return t;
}

/** Yo'lga yoziladigan matn (START, FINISH): oq harflar, shaffof fon */
export function yozuvTekstura(matn: string) {
  const { c, g } = kanvas(1024, 256);
  g.fillStyle = '#ffffff';
  g.font = 'bold 200px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(matn, 512, 138);
  const t = kanvasTekstura(c);
  return { t, nisbat: Math.min(4, (g.measureText(matn).width + 40) / 256) };
}

/** Davlat raqami: O'zbekiston namunasiga o'xshash (bayroqli), matn — AUTOSTART */
export function raqamTekstura() {
  const { c, g } = kanvas(512, 112);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 112);
  g.lineWidth = 8; g.strokeStyle = '#111'; g.strokeRect(4, 4, 504, 104);
  g.fillStyle = '#111'; g.font = 'bold 64px Arial, sans-serif'; g.textBaseline = 'middle';
  g.fillText('01', 24, 60);
  g.fillRect(104, 14, 4, 84);
  g.font = 'bold 66px Arial, sans-serif';
  g.fillText('A 777 AS', 124, 60);
  // bayroq (ko'k-oq-yashil)
  const bx = 444;
  g.fillStyle = '#1eb4e6'; g.fillRect(bx, 22, 46, 14);
  g.fillStyle = '#fff'; g.fillRect(bx, 36, 46, 14);
  g.fillStyle = '#2cae4a'; g.fillRect(bx, 50, 46, 14);
  g.fillStyle = '#111'; g.font = 'bold 26px Arial, sans-serif'; g.fillText('UZ', bx + 6, 84);
  return kanvasTekstura(c);
}

/** Tom ustidagi o'quv avtomobili belgisi (ikki tomonli) */
export function tomBelgiTekstura() {
  const { c, g } = kanvas(512, 160);
  const gr = g.createLinearGradient(0, 0, 0, 160);
  gr.addColorStop(0, '#ffd21f'); gr.addColorStop(1, '#f2b705');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#111'; g.font = 'bold 74px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('AUTOSTART', 256, 62);
  g.font = 'bold 40px Arial, sans-serif';
  g.fillText('O‘QUV AVTOMOBILI', 256, 124);
  return kanvasTekstura(c);
}

/** Bino peshtoqi yozuvi */
export function peshtoqTekstura(matn: string, ost: string) {
  const { c, g } = kanvas(1024, 192);
  g.fillStyle = '#1c2b3a'; g.fillRect(0, 0, 1024, 192);
  g.fillStyle = '#ffd21f'; g.fillRect(0, 176, 1024, 16);
  g.fillStyle = '#fff'; g.font = 'bold 96px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(matn, 512, 74);
  g.fillStyle = '#ffd21f'; g.font = 'bold 44px Arial, sans-serif';
  g.fillText(ost, 512, 146);
  return kanvasTekstura(c);
}

/** Bino oynalari (qavatli) */
export function oynaTekstura() {
  const { c, g } = kanvas(256, 256);
  g.fillStyle = '#d9d4c7'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) {
    const gr = g.createLinearGradient(0, 0, 0, 80);
    gr.addColorStop(0, '#7fa6c4'); gr.addColorStop(1, '#2f4f6a');
    g.fillStyle = gr;
    g.fillRect(14 + x * 62, 24 + y * 124, 46, 80);
    g.fillStyle = '#eee'; g.fillRect(14 + x * 62, 102 + y * 124, 46, 6);
  }
  const t = kanvasTekstura(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
