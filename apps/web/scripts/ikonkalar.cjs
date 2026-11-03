/**
 * Ilova ikonkalari: assets/emblema.png (shaffof fonli emblema) dan Android,
 * iOS va Play Market ikonkalarini yasaydi. Fon — oq.
 *
 *   node scripts/ikonkalar.cjs
 *
 * Logo hech qaysi niqobda (doira, kvadrat, Samsung "squircle") kesilmasligi uchun
 * emblemani qamrab oluvchi eng kichik doira hisoblanadi va o'sha doira xavfsiz
 * zonaga sig'diriladi. Faqat balandlik bo'yicha o'lchash yetmaydi — doira
 * niqobda burchaklar kesiladi.
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
const FON = '#ffffff';

// Adaptiv ikonka: 108dp maydon, Android hech qachon kesmaydigan xavfsiz zona — markazdagi
// 66dp doira (radius 0.306). Samsung deyarli aynan shu oraliqni ko'rsatadi — logo chetga
// tegmasin, atrofida bo'sh joy qolsin deb 0.28 olinadi (emblema bo'yi ~56%).
const XAVFSIZ_ADAPTIV = 0.28;
// Tayyor shakldagi ikonkalar (eski Android, iOS, Play): doira radiusi kvadratning 40% i
const XAVFSIZ_TAYYOR = 0.4;

/** Emblemani qamrab oluvchi eng kichik doira: markaz (0..1, emblema o'lchamiga nisbatan) va radius (balandlikka nisbatan) */
async function qamrovchiDoira() {
  const { data, info } = await sharp(EMBLEMA).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : data[(y * w + x) * c + 3]);
  // Faqat chegara piksellari — eng uzoq nuqta shulardan biri
  const nuqtalar = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (a(x, y) > 24 && (a(x - 1, y) <= 24 || a(x + 1, y) <= 24 || a(x, y - 1) <= 24 || a(x, y + 1) <= 24))
        nuqtalar.push([x, y]);
  let eng = { r: Infinity, cx: w / 2, cy: h / 2 };
  for (let cy = Math.round(h * 0.3); cy <= h * 0.7; cy++)
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

/** olcham×olcham kvadrat: emblemaning qamrovchi doirasi markazda, radiusi = olcham × xavfsiz */
async function kvadrat(olcham, xavfsiz, fon) {
  const balandlik = Math.round((olcham * xavfsiz) / D.r);
  const em = await sharp(EMBLEMA).resize({ height: balandlik }).toBuffer({ resolveWithObject: true });
  return sharp({ create: { width: olcham, height: olcham, channels: 4, background: fon || { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{
      input: em.data,
      left: Math.round(olcham / 2 - D.cx * em.info.width),
      top: Math.round(olcham / 2 - D.cy * em.info.height),
    }])
    .png();
}

// Eski Android uchun tayyor shakl: yumaloq kvadrat yoki doira
const niqob = (olcham, doira) =>
  Buffer.from(
    `<svg width="${olcham}" height="${olcham}"><rect width="${olcham}" height="${olcham}" ` +
      `rx="${doira ? olcham / 2 : olcham * 0.22}" fill="#fff"/></svg>`
  );

(async () => {
  D = await qamrovchiDoira();
  console.log(`qamrovchi doira: markaz (${D.cx.toFixed(3)}, ${D.cy.toFixed(3)}), radius ${D.r.toFixed(3)} × balandlik`);

  const zichlik = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [nom, k] of Object.entries(zichlik)) {
    const dir = path.join(RES, 'mipmap-' + nom);
    // Adaptiv ikonka (Android 8+): shaffof old qatlam, fon — rang (values/ic_launcher_background.xml)
    await (await kvadrat(Math.round(108 * k), XAVFSIZ_ADAPTIV)).toFile(path.join(dir, 'ic_launcher_foreground.png'));
    // Eski Android (7 va undan past): 48dp tayyor ikonka — oq yumaloq kvadrat va oq doira
    const L = Math.round(48 * k);
    for (const [fayl, doira] of [['ic_launcher.png', false], ['ic_launcher_round.png', true]]) {
      const ichki = await (await kvadrat(L, XAVFSIZ_TAYYOR, FON)).toBuffer();
      await sharp(ichki).composite([{ input: niqob(L, doira), blend: 'dest-in' }]).png().toFile(path.join(dir, fayl));
    }
    fs.rmSync(path.join(dir, 'ic_launcher_background.png'), { force: true }); // fon — rang, rasm emas
  }

  // Adaptiv ikonka: fon — oq rang, old qatlam — emblema; inset YO'Q (logo kichrayib ketmasin)
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26/ic_launcher.xml'), xml);
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26/ic_launcher_round.xml'), xml);
  fs.writeFileSync(
    path.join(RES, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n`
  );

  // iOS: 1024 kvadrat, alfa kanalsiz (App Store shaffoflikni qabul qilmaydi), burchaklarini iOS o'zi yumaloqlaydi
  const ios = path.join(ILDIZ, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  await sharp(await (await kvadrat(1024, XAVFSIZ_TAYYOR, FON)).toBuffer()).removeAlpha().png().toFile(ios);

  // Play Market do'kon sahifasi uchun 512x512 (alfasiz)
  const dokon = path.join(ILDIZ, 'assets/dokon');
  fs.mkdirSync(dokon, { recursive: true });
  await sharp(await (await kvadrat(512, XAVFSIZ_TAYYOR, FON)).toBuffer()).removeAlpha().png().toFile(path.join(dokon, 'play-ikonka-512.png'));

  console.log('ikonkalar tayyor');
})();
