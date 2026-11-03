/**
 * Ilova ikonkalari: assets/emblema.png (shaffof fonli emblema, asl nisbatda) dan
 *  - Android adaptiv ikonka (8+): alohida old (ic_launcher_foreground), fon (ic_launcher_background)
 *    va monoxrom (ic_launcher_monochrome, Android 13+ "themed icons") qatlamlari, 108dp;
 *  - eski Android (7 va past): tayyor ic_launcher (yumaloq kvadrat) va ic_launcher_round (doira);
 *  - iOS (1024) va Play Market (512) ikonkalari.
 *
 *   node scripts/ikonkalar.cjs [toq|kok|qora]          — fon varianti (standart: toq)
 *   node scripts/ikonkalar.cjs --korik <chiqish.png>   — 3 variantni turli niqoblarda ko'rsatadi
 *                                                         (loyiha fayllariga tegmaydi)
 *
 * Logo hech qaysi niqobda kesilmasligi uchun emblemani qamrab oluvchi eng kichik doira
 * hisoblanadi va o'sha doira Android'ning xavfsiz zonasiga (markazdagi 66dp doira)
 * deyarli to'liq sig'diriladi. Fon esa butun 108dp maydonni to'ldiradi — ikonka
 * shaklining chetigacha rangli, oq hoshiya qolmaydi.
 *
 * `capacitor-assets generate` ikonkani ishlatmang: u adaptiv ikonkaga
 * inset="16.7%" qo'shadi va logo telefonda juda kichik chiqadi.
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ILDIZ = path.join(__dirname, '..');
const EMBLEMA = path.join(ILDIZ, 'assets/emblema.png');
const RES = path.join(ILDIZ, 'android/app/src/main/res');

// Fon variantlari: markazdan chetga yumshoq radial gradient (rang chetigacha boradi).
// Hammasi qizil, sariq va yashil bilan kuchli kontrast beradi.
const FONLAR = {
  toq: { nom: "To'q kulrang (ilova rangi)", ichki: '#3e3c3a', tashqi: '#1f1e1d', asosiy: '#2B2A29' },
  kok: { nom: "To'q ko'k", ichki: '#1a3d6b', tashqi: '#0a1a31', asosiy: '#10294A' },
  qora: { nom: "To'q qora", ichki: '#000000', tashqi: '#000000', asosiy: '#000000' },
};

// Adaptiv ikonka: 108dp maydon, ko'rinadigan qismi markazdagi 72dp, hech qaysi niqob kesmaydigan
// xavfsiz zona — markazdagi 66dp doira (radius 33dp = 0.3056). Emblemaning qamrovchi doirasi
// 32.6dp — zonani deyarli to'ldiradi, 0.4dp zaxira silliqlangan chet piksellari uchun.
const XAVFSIZ_ADAPTIV = 32.6 / 108;
// Tayyor shakldagi ikonkalar (eski Android, iOS, Play): qamrovchi doira radiusi kvadrat tomonining 42% i
const XAVFSIZ_TAYYOR = 0.42;

/** Emblemani qamrab oluvchi eng kichik doira: markaz (0..1, emblema o'lchamiga nisbatan) va radius (balandlikka nisbatan) */
async function qamrovchiDoira() {
  const { data, info } = await sharp(EMBLEMA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * c + 3]);
  // Faqat chegara piksellari — eng uzoq nuqta shulardan biri
  const nuqtalar = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (a(x, y) > 24 && (a(x - 1, y) <= 24 || a(x + 1, y) <= 24 || a(x, y - 1) <= 24 || a(x, y + 1) <= 24))
        nuqtalar.push([x, y]);
  let eng = { r: Infinity, cx: w / 2, cy: h / 2 };
  for (let cy = Math.round(h * 0.25); cy <= h * 0.75; cy++)
    for (let cx = Math.round(w * 0.25); cx <= w * 0.75; cx++) {
      let r = 0;
      for (const [x, y] of nuqtalar) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r && (r = d) > eng.r) break;
      }
      if (r < eng.r) eng = { r, cx, cy };
    }
  return { cx: eng.cx / w, cy: eng.cy / h, r: eng.r / h };
}

let D; // qamrovchi doira (bir marta hisoblanadi)

/** Fon: olcham×olcham radial gradient. korinadi — kvadratning ko'rinadigan ulushi (adaptivda 72/108) */
const fonSvg = (olcham, f, korinadi = 1) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${olcham}" height="${olcham}"><defs>` +
      `<radialGradient id="g" cx="50%" cy="44%" r="${(75 * korinadi).toFixed(1)}%">` +
      `<stop offset="0" stop-color="${f.ichki}"/><stop offset="1" stop-color="${f.tashqi}"/></radialGradient>` +
      `</defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  );

/** Shaffof olcham×olcham kvadrat, emblemaning qamrovchi doirasi markazda, radiusi = olcham × xavfsiz */
async function emblemaQatlami(olcham, xavfsiz, oq = false) {
  const balandlik = Math.round((olcham * xavfsiz) / D.r);
  let em = await sharp(EMBLEMA).ensureAlpha().resize({ height: balandlik }).png().toBuffer({ resolveWithObject: true });
  if (oq) {
    // Monoxrom: shakl o'zgarmaydi, faqat oq rang (Android uni mavzu rangiga bo'yaydi)
    const oqRasm = await sharp({ create: { width: em.info.width, height: em.info.height, channels: 4, background: '#ffffff' } })
      .composite([{ input: em.data, blend: 'dest-in' }]).png().toBuffer();
    em = { data: oqRasm, info: em.info };
  }
  return sharp({ create: { width: olcham, height: olcham, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: em.data, left: Math.round(olcham / 2 - D.cx * em.info.width), top: Math.round(olcham / 2 - D.cy * em.info.height) }])
    .png()
    .toBuffer();
}

/** Fon + emblema bitta rasmda (eski Android, iOS, Play va ko'rik uchun) */
async function toliq(olcham, xavfsiz, f, korinadi = 1) {
  const fon = await sharp(fonSvg(olcham, f, korinadi)).png().toBuffer();
  return sharp(fon).composite([{ input: await emblemaQatlami(olcham, xavfsiz) }]).png().toBuffer();
}

// Niqoblar (oq = ko'rinadigan qism)
const niqobSvg = (olcham, shakl) => {
  if (shakl === 'doira') return `<svg width="${olcham}" height="${olcham}"><circle cx="${olcham / 2}" cy="${olcham / 2}" r="${olcham / 2}" fill="#fff"/></svg>`;
  if (shakl === 'kvadrat') return `<svg width="${olcham}" height="${olcham}"><rect width="${olcham}" height="${olcham}" rx="${olcham * 0.22}" fill="#fff"/></svg>`;
  // squircle (Samsung One UI ga o'xshash superellips, n = 5)
  const n = 5, R = olcham / 2, q = [];
  for (let i = 0; i < 360; i++) {
    const t = (i / 360) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t);
    q.push(`${(R + R * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(2)},${(R + R * Math.sign(s) * Math.abs(s) ** (2 / n)).toFixed(2)}`);
  }
  return `<svg width="${olcham}" height="${olcham}"><polygon points="${q.join(' ')}" fill="#fff"/></svg>`;
};
const niqobla = (rasm, olcham, shakl) =>
  sharp(rasm).composite([{ input: Buffer.from(niqobSvg(olcham, shakl)), blend: 'dest-in' }]).png().toBuffer();

/** Adaptiv ikonkani launcher kabi ko'rsatish: 108dp qatlamlar, markazdagi 72dp niqoblanadi */
async function adaptivKorinish(olcham, f, shakl) {
  const qatlam = Math.round((olcham * 108) / 72);
  const fon = await sharp(fonSvg(qatlam, f, 72 / 108)).png().toBuffer();
  const birga = await sharp(fon).composite([{ input: await emblemaQatlami(qatlam, XAVFSIZ_ADAPTIV) }]).png().toBuffer();
  const kes = Math.round((qatlam - olcham) / 2);
  const markaz = await sharp(birga).extract({ left: kes, top: kes, width: olcham, height: olcham }).png().toBuffer();
  return niqobla(markaz, olcham, shakl);
}

/** Emblemaning markazdan eng uzoq nuqtasi (dp) — 33 dan oshmasligi kerak */
async function engUzoqDp() {
  const o = 432; // xxxhdpi: 1dp = 4px
  const { data } = await sharp(await emblemaQatlami(o, XAVFSIZ_ADAPTIV)).raw().toBuffer({ resolveWithObject: true });
  let m = 0;
  for (let y = 0; y < o; y++) for (let x = 0; x < o; x++) if (data[(y * o + x) * 4 + 3] > 8) m = Math.max(m, Math.hypot(x + 0.5 - o / 2, y + 0.5 - o / 2));
  return m / 4;
}

async function korik(chiqish) {
  const I = 200, G = 28, CHAP = 230, TEPA = 70;
  const ustunlar = ['Doira', 'Squircle (Samsung)', 'Yumaloq kvadrat', 'Eski Android (doira)', 'Play Market'];
  const qatorlar = Object.entries(FONLAR);
  const W = CHAP + ustunlar.length * (I + G), H = TEPA + qatorlar.length * (I + 60) + 20;
  const yoz = (x, y, matn, o = 22, rang = '#1d1d1f', vazn = 700) =>
    `<text x="${x}" y="${y}" font-family="Segoe UI, Arial" font-size="${o}" font-weight="${vazn}" fill="${rang}">${matn.replace(/'/g, '&#8217;')}</text>`;
  let matnlar = ustunlar.map((u, i) => yoz(CHAP + i * (I + G) + 4, 44, u, 19, '#3a3a3c', 600)).join('');
  const qatlam = [];
  for (let r = 0; r < qatorlar.length; r++) {
    const [kalit, f] = qatorlar[r];
    const y = TEPA + r * (I + 60);
    matnlar += yoz(16, y + I / 2 - 6, String.fromCharCode(65 + r) + ': ' + f.nom.split(' (')[0], 24) +
      (f.nom.includes('(') ? yoz(16, y + I / 2 + 24, '(' + f.nom.split(' (')[1], 18, '#55555a', 500) : '') +
      yoz(16, y + I / 2 + 52, 'node scripts/ikonkalar.cjs ' + kalit, 14, '#6e6e73', 500);
    const rasmlar = [
      await adaptivKorinish(I, f, 'doira'),
      await adaptivKorinish(I, f, 'squircle'),
      await adaptivKorinish(I, f, 'kvadrat'),
      await niqobla(await toliq(I, XAVFSIZ_TAYYOR, f), I, 'doira'),
      await niqobla(await toliq(I, XAVFSIZ_TAYYOR, f), I, 'kvadrat'),
    ];
    rasmlar.forEach((input, i) => qatlam.push({ input, left: CHAP + i * (I + G), top: y }));
  }
  const fon = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#d9dde3"/>${matnlar}</svg>`);
  await sharp(fon).composite(qatlam).png().toFile(chiqish);
  console.log('ko‘rik:', chiqish);
}

(async () => {
  D = await qamrovchiDoira();
  const uzoq = await engUzoqDp();
  console.log(`qamrovchi doira: markaz (${D.cx.toFixed(3)}, ${D.cy.toFixed(3)}); logoning markazdan eng uzoq nuqtasi ${uzoq.toFixed(2)}dp (xavfsiz zona chegarasi 33dp)`);
  if (uzoq > 33) throw new Error('logo xavfsiz zonadan chiqib ketdi');

  const arg = process.argv.slice(2);
  if (arg[0] === '--korik') return korik(arg[1] || 'ikonka-korik.png');

  const kalit = arg[0] || 'toq';
  const f = FONLAR[kalit];
  if (!f) throw new Error('noma’lum fon: ' + kalit + ' (bor: ' + Object.keys(FONLAR).join(', ') + ')');
  console.log('fon:', f.nom);

  const zichlik = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [nom, k] of Object.entries(zichlik)) {
    const dir = path.join(RES, 'mipmap-' + nom);
    fs.mkdirSync(dir, { recursive: true });
    const Q = Math.round(108 * k); // xxxhdpi: 432×432
    // Adaptiv ikonka qatlamlari: shaffof old, to'liq fon, monoxrom
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), await emblemaQatlami(Q, XAVFSIZ_ADAPTIV));
    await sharp(fonSvg(Q, f, 72 / 108)).removeAlpha().png().toFile(path.join(dir, 'ic_launcher_background.png'));
    fs.writeFileSync(path.join(dir, 'ic_launcher_monochrome.png'), await emblemaQatlami(Q, XAVFSIZ_ADAPTIV, true));
    // Eski Android (7 va past): 48dp tayyor ikonka — yumaloq kvadrat va doira, fon chetigacha
    const L = Math.round(48 * k);
    const ichki = await toliq(L, XAVFSIZ_TAYYOR, f);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), await niqobla(ichki, L, 'kvadrat'));
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), await niqobla(ichki, L, 'doira'));
  }

  // Adaptiv ikonka XML: fon va old qatlam rasm, monoxrom — Android 13+ mavzuli ikonkalar uchun.
  // inset YO'Q (logo kichrayib ketmasin)
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`;
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26/ic_launcher.xml'), xml);
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26/ic_launcher_round.xml'), xml);
  fs.writeFileSync(
    path.join(RES, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${f.asosiy}</color>\n</resources>\n`
  );

  // iOS: 1024 kvadrat, alfa kanalsiz (App Store shaffoflikni qabul qilmaydi), burchaklarini iOS o'zi yumaloqlaydi
  const ios = path.join(ILDIZ, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  if (fs.existsSync(path.dirname(ios))) await sharp(await toliq(1024, XAVFSIZ_TAYYOR, f)).removeAlpha().png().toFile(ios);

  // Play Market do'kon sahifasi uchun 512x512 (alfasiz, kvadrat — burchaklarini Play o'zi yumaloqlaydi)
  const dokon = path.join(ILDIZ, 'assets/dokon');
  fs.mkdirSync(dokon, { recursive: true });
  await sharp(await toliq(512, XAVFSIZ_TAYYOR, f)).removeAlpha().png().toFile(path.join(dokon, 'play-ikonka-512.png'));

  console.log('ikonkalar tayyor');
})().catch((e) => { console.error('XATO:', e.message); process.exit(1); });
