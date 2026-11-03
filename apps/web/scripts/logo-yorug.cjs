/**
 * Yorug' mavzu uchun logotip: src/ilova/rasmlar/logo.webp (to'q #2B2A29 fonli) dan
 * shaffof fonli logo-yorug.webp yasaydi.
 *
 *   node scripts/logo-yorug.cjs
 *
 * - Fon olib tashlanadi ("rangdan shaffoflik": silliq chetlar fon bilan aralashgan bo'lsa
 *   ham asl rang va shaffoflik qayta tiklanadi — oq/qora hoshiya qolmaydi).
 * - Oq yozuvlar ("AUTO", "HAYDOVCHILAR TAYYORLASH MAKTABI") to'q rangga (#1F1E1D) o'tadi.
 * - Sariq "START" o'z rangida qoladi, yorug' fonda o'qilishi uchun atrofiga ingichka to'q
 *   hoshiya qo'shiladi. Emblema (chapdagi rangli belgi) o'zgarmaydi.
 */
const sharp = require('sharp');
const path = require('path');

const KIR = path.join(__dirname, '../src/ilova/rasmlar/logo.webp');
const CHIQ = path.join(__dirname, '../src/ilova/rasmlar/logo-yorug.webp');
const FON = [0x2b, 0x2a, 0x29];
const TOQ = [0x1f, 0x1e, 0x1d];
const HOSHIYA = 3.4; // px (logo.webp 904px, ekranda 258px — taxminan 1px)

(async () => {
  const { data, info } = await sharp(KIR).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  // Emblemaning o'ng cheti: chapdan boshlab rangli (to'yingan) ustunlar tugagan joy
  const rangli = (x, y) => { const i = (y * W + x) * 3; return Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 90; };
  let emblemaX = -1;
  for (let x = 0, bosh = 0; x < W; x++) {
    let bor = false;
    for (let y = 0; y < H && !bor; y++) bor = rangli(x, y);
    if (bor) { emblemaX = x; bosh = 0; } else if (emblemaX >= 0 && ++bosh > 6) break;
  }

  const rang = new Float32Array(W * H * 3);
  const alfa = new Float32Array(W * H);
  const sariq = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const P = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
    // Rangdan shaffoflik (fon rangiga nisbatan eng katta og'ish)
    let a = 0;
    for (let c = 0; c < 3; c++) {
      const d = P[c] - FON[c];
      a = Math.max(a, Math.abs(d) / (d > 0 ? 255 - FON[c] : FON[c]));
    }
    if (a < 0.02) continue;
    a = Math.min(1, a);
    let F = P.map((v, c) => Math.max(0, Math.min(255, FON[c] + (v - FON[c]) / a)));
    const x = p % W;
    if (x > emblemaX + 2) {
      const toy = Math.max(...F) - Math.min(...F);
      if (toy < 70) F = TOQ.slice(); // oq yozuv → to'q
      else if (F[0] > 170 && F[1] > 150 && F[2] < 140) sariq[p] = a; // "START"
    }
    rang[p * 3] = F[0]; rang[p * 3 + 1] = F[1]; rang[p * 3 + 2] = F[2];
    alfa[p] = a;
  }

  // "START" atrofida yumshoq hoshiya: sariq niqobni HOSHIYA radiusda kengaytirish
  const R = Math.ceil(HOSHIYA + 1);
  const hoshiya = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let m = 0;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= W) continue;
          const s = sariq[yy * W + xx]; if (!s) continue;
          const w = Math.max(0, Math.min(1, HOSHIYA + 0.5 - Math.hypot(dx, dy)));
          if (s * w > m) m = s * w;
        }
      }
      hoshiya[y * W + x] = m;
    }

  // Yakuniy rasm: logo qatlami hoshiya ustida ("over")
  const out = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const as = alfa[p], ad = hoshiya[p] * (1 - as), ar = as + ad;
    if (ar <= 0) continue;
    for (let c = 0; c < 3; c++) out[p * 4 + c] = Math.round((rang[p * 3 + c] * as + TOQ[c] * ad) / ar);
    out[p * 4 + 3] = Math.round(ar * 255);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true }).toFile(CHIQ);
  console.log('tayyor:', CHIQ, `(emblema o'ng cheti x=${emblemaX})`);
})().catch((e) => { console.error('XATO:', e.message); process.exit(1); });
