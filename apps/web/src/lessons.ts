/**
 * Amaliy mashg'ulot toifalari. Ro'yxat serverdagi apps/api/src/uploads.ts
 * dagi TOIFALAR bilan bir xil bo'lishi kerak — server notanish toifani
 * "Boshqa" ga aylantirib yuboradi.
 */
export const TOIFALAR = ['A', 'B', 'C', 'D', 'E', 'BC', 'CE', 'Boshqa'] as const;

export const TOIFA_IZOH: Record<string, string> = {
  A: 'Mototsikl',
  B: 'Yengil avtomobil',
  C: 'Yuk avtomobili',
  D: 'Avtobus',
  E: 'Tirkama',
  BC: 'Yengil + yuk',
  CE: 'Yuk + tirkama',
  Boshqa: 'Boshqa toifalar',
};

/** 734003200 -> "700 MB" */
export function hajm(bytes: number): string {
  if (!bytes || bytes < 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  if (mb < 1024) return Math.round(mb) + ' MB';
  return (mb / 1024).toFixed(1) + ' GB';
}

export const sana = (s: string) => {
  try { return new Date(s).toLocaleDateString('uz-UZ'); } catch { return ''; }
};
