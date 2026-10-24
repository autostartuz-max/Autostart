/**
 * Ilova ikonkalari: assets/emblema.png (shaffof fonli emblema) dan Android,
 * iOS va Play Market ikonkalarini yasaydi. Fon — logotipdagi to'q rang, emblema ikonkani to'ldiradi.
 *
 *   node scripts/ikonkalar.cjs
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
const FON = '#2b2a29'; // rasmiy AUTOSTART logotipining foni

// Emblemani kvadrat ichiga joylash: balandligi — kvadratning `ulush` qismi
async function kvadrat(olcham, ulush, fon) {
  const em = await sharp(EMBLEMA).resize({ height: Math.round(olcham * ulush) }).toBuffer();
  const m = await sharp(em).metadata();
  return sharp({ create: { width: olcham, height: olcham, channels: 4, background: fon || { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: em, left: Math.round((olcham - m.width) / 2), top: Math.round((olcham - m.height) / 2) }])
    .png();
}

// Burchaklari yumaloq / doira shakl (eski Android ikonkalari uchun)
const niqob = (olcham, doira) =>
  Buffer.from(
    `<svg width="${olcham}" height="${olcham}"><rect width="${olcham}" height="${olcham}" ` +
      `rx="${doira ? olcham / 2 : olcham * 0.22}" fill="#fff"/></svg>`
  );

(async () => {
  const zichlik = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [nom, k] of Object.entries(zichlik)) {
    const dir = path.join(RES, 'mipmap-' + nom);
    // Adaptiv ikonka (Android 8+): 108dp maydon, ko'rinadigani o'rtadagi ~72dp.
    // Emblema balandligi 52% — Android xavfsiz zonasiga (66dp doira) sig'adi: Samsung
    // niqobi kattaroq emblemaning tepasi va pastini kesib qo'yardi.
    await (await kvadrat(Math.round(108 * k), 0.52)).toFile(path.join(dir, 'ic_launcher_foreground.png'));
    // Eski Android (7 va undan past): 48dp tayyor ikonka — to'q fon, emblema katta
    const L = Math.round(48 * k);
    for (const [fayl, doira, ulush] of [['ic_launcher.png', false, 0.84], ['ic_launcher_round.png', true, 0.74]]) {
      const ichki = await (await kvadrat(L, ulush, FON)).toBuffer();
      await sharp(ichki).composite([{ input: niqob(L, doira), blend: 'dest-in' }]).png().toFile(path.join(dir, fayl));
    }
    fs.rmSync(path.join(dir, 'ic_launcher_background.png'), { force: true }); // fon endi rang
  }

  // Adaptiv ikonka: fon — to'q rang, old qatlam — emblema; inset YO'Q (logo kichrayib ketmasin)
  const xml =
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26/ic_launcher.xml'), xml);
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26/ic_launcher_round.xml'), xml);
  fs.writeFileSync(
    path.join(RES, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2B2A29</color>\n</resources>\n`
  );

  // iOS: 1024 kvadrat, alfa kanalsiz (App Store shaffoflikni qabul qilmaydi), burchaklarini iOS o'zi yumaloqlaydi
  const ios = path.join(ILDIZ, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  await sharp(await (await kvadrat(1024, 0.84, FON)).toBuffer()).removeAlpha().png().toFile(ios);

  // Play Market do'kon sahifasi uchun 512x512 (alfasiz)
  const dokon = path.join(ILDIZ, 'assets/dokon');
  fs.mkdirSync(dokon, { recursive: true });
  await sharp(await (await kvadrat(512, 0.84, FON)).toBuffer()).removeAlpha().png().toFile(path.join(dokon, 'play-ikonka-512.png'));

  console.log('ikonkalar tayyor');
})();
