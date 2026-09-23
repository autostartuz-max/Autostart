import fs from 'fs';
import { spawn } from 'child_process';
import { lessonFilePath, mobilFilePath } from './uploads';

/**
 * MOBIL ILOVA UCHUN SIQILGAN NUSXA
 *
 * Saytdagi video O'ZGARMAYDI — asl fayl qanday bo'lsa shunday qoladi va
 * brauzerda o'sha beriladi. Ilova esa yonidagi siqilgan nusxani oladi:
 * 1.6 GB lik dars telefonda ~200 MB bo'ladi, mobil internetda ochiladi.
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
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => { ffmpegHolati = false; resolve(false); });
    p.on('close', (kod) => { ffmpegHolati = kod === 0; resolve(ffmpegHolati); });
  });
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
