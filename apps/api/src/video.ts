import fs from 'fs';
import { spawn } from 'child_process';
import { lessonFilePath, mobilFilePath, posterFilePath } from './uploads';

/**
 * SIQILGAN NUSXA (720p) VA MUQOVA
 *
 * Asl fayl (4K, 20–30 Mbit/s, 1,5–2,7 GB) diskda tegilmay qoladi. Ko'rish uchun sayt ham,
 * ilova ham yonidagi siqilgan nusxani oladi (~0,9 Mbit/s, 20 baravar yengil) — 4K ni server
 * ham, talabaning interneti ham tez bera olmasdi (2026-11-14). Ro'yxatlarda esa videoning
 * o'zi emas, kichik JPEG muqova ko'rsatiladi.
 *
 * Siqish ffmpeg bilan, fonda bajariladi — admin yuklash tugagach kutib
 * turmaydi. ffmpeg o'rnatilmagan bo'lsa hech narsa buzilmaydi: nusxa
 * yaratilmaydi, ilova asl faylni oladi (avvalgidek).
 */

/** Bir vaqtda bitta ffmpeg — server boshqa ish qilolmay qolmasin */
const navbat: string[] = [];
let ishlayapti = false;

let ffmpegHolati: boolean | null = null;
/** ffmpeg o'rnatilganmi (bir marta tekshiriladi) */
export function ffmpegBormi(): Promise<boolean> {
  if (ffmpegHolati !== null) return Promise.resolve(ffmpegHolati);
  return new Promise((resolve) => {
    // Linux serverda eng past ustuvorlik (nice 19): siqish faqat bo'sh
    // protsessor vaqtidan foydalanadi — sayt sekinlashmaydi.
    const [buyruq, oldi] = process.platform === 'win32' ? ['ffmpeg', [] as string[]] : ['nice', ['-n', '19', 'ffmpeg']];
    const p = spawn(buyruq, [
      ...oldi,'-version']);
    p.on('error', () => { ffmpegHolati = false; resolve(false); });
    p.on('close', (kod) => { ffmpegHolati = kod === 0; resolve(ffmpegHolati); });
  });
}

/**
 * Dars muqovasi: videoning 20-soniyasidagi kadr (boshidagi logotip emas — dars mazmuni; qisqa
 * videoda 1-soniya), eni 640px JPEG (~30–60 KB). Bir marta yasaladi
 * va diskda saqlanadi. Siqilgan nusxa bo'lsa o'shandan (tez), bo'lmasa asl fayldan.
 * Bir vaqtda bitta fayl uchun bitta ffmpeg.
 */
const muqovaJarayon = new Map<string, Promise<boolean>>();
export function muqovaYasa(fileName: string): Promise<boolean> {
  const chiqish = posterFilePath(fileName);
  try { if (fs.statSync(chiqish).size > 0) return Promise.resolve(true); } catch { /* hali yo'q */ }
  const bor = muqovaJarayon.get(fileName);
  if (bor) return bor;
  const kirish = mobilNusxaBormi(fileName) ? mobilFilePath(fileName) : lessonFilePath(fileName);
  const vaqtinchalik = chiqish + '.tmp';
  // Bitta kadr: soniya — qayerdan; muvaffaqiyatli bo'lsa true
  const kadr = (soniya: string) => new Promise<boolean>((resolve) => {
    const f = spawn('ffmpeg', ['-y', '-ss', soniya, '-i', kirish, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', '-f', 'image2', vaqtinchalik]);
    f.on('error', () => resolve(false));
    f.on('close', (kod) => {
      try {
        if (kod === 0 && fs.statSync(vaqtinchalik).size > 0) { fs.renameSync(vaqtinchalik, chiqish); return resolve(true); }
      } catch { /* pastda */ }
      try { fs.unlinkSync(vaqtinchalik); } catch { /* yo'q */ }
      resolve(false);
    });
  });
  const p = (fs.existsSync(kirish) ? kadr('20').then((ok) => ok || kadr('1')) : Promise.resolve(false))
    .finally(() => muqovaJarayon.delete(fileName));
  muqovaJarayon.set(fileName, p);
  return p;
}

/** Siqilgan nusxa tayyormi */
export function mobilNusxaBormi(fileName: string): boolean {
  try { return fs.statSync(mobilFilePath(fileName)).size > 0; } catch { return false; }
}

/** Darsni navbatga qo'yadi (takrorlanmaydi) va navbatni yurgizadi */
export function mobilNusxaNavbatga(fileName: string) {
  if (!fileName || navbat.includes(fileName) || mobilNusxaBormi(fileName)) return;
  navbat.push(fileName);
  navbatniYurgiz();
}

async function navbatniYurgiz() {
  if (ishlayapti) return;
  const fileName = navbat.shift();
  if (!fileName) return;

  if (!(await ffmpegBormi())) {
    console.warn('[video] ffmpeg topilmadi — mobil nusxa yaratilmaydi. O‘rnatish: sudo apt install -y ffmpeg');
    navbat.length = 0;
    return;
  }

  ishlayapti = true;
  try {
    await siq(fileName);
    // Muqova siqilgan nusxadan qayta yasalsin (yuklash paytida asl fayldan yasalgan bo'lishi mumkin)
    try { fs.unlinkSync(posterFilePath(fileName)); } catch { /* yo'q */ }
    await muqovaYasa(fileName);
  } catch (e: any) {
    console.error('[video] siqishda xato:', fileName, e?.message || e);
  } finally {
    ishlayapti = false;
    if (navbat.length) navbatniYurgiz();
  }
}

/** Bitta faylni siqadi: 720p, H.264, faststart (birinchi kadr tez ochilsin) */
export function siq(fileName: string): Promise<void> {
  const kirish = lessonFilePath(fileName);
  const chiqish = mobilFilePath(fileName);
  // Yarim qolgan fayl "tayyor" deb o'qilmasligi uchun avval .tmp ga yozamiz
  const vaqtinchalik = chiqish + '.tmp';

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(kirish)) return reject(new Error('asl fayl yo‘q: ' + fileName));

    const p = spawn('ffmpeg', [
      '-y', '-i', kirish,
      // Balandligi 720 dan katta bo'lsa kichraytiramiz, kichigiga tegmaymiz
      '-vf', "scale='min(1280,iw)':-2",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart',
      // Format ochiq ko'rsatiladi: chiqish fayli `.tmp` bilan tugagani uchun
      // ffmpeg uni kengaytmasidan aniqlay olmaydi va "Unable to find a
      // suitable output format" deb to'xtab qoladi.
      '-f', 'mp4',
      vaqtinchalik,
    ]);

    let xato = '';
    p.stderr.on('data', (d) => { xato = String(d).slice(-500); });
    p.on('error', reject);
    p.on('close', (kod) => {
      if (kod !== 0) {
        try { fs.unlinkSync(vaqtinchalik); } catch { /* yo'q bo'lsa ham mayli */ }
        return reject(new Error('ffmpeg xatosi (' + kod + '): ' + xato));
      }
      try {
        fs.renameSync(vaqtinchalik, chiqish);
        const a = fs.statSync(kirish).size;
        const b = fs.statSync(chiqish).size;
        console.log(`[video] ${fileName}: ${(a / 1048576).toFixed(0)} MB → ${(b / 1048576).toFixed(0)} MB`);
        resolve();
      } catch (e) { reject(e as Error); }
    });
  });
}
