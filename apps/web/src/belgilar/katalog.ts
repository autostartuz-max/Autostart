/**
 * Yo'l belgilari — Yo'l harakati qoidalari (O'zR VM 2022-yil 12-apreldagi 172-son qarori),
 * 1-ilova "Yo'l belgilari" va 176-band (taniqlik belgilari).
 *
 * Belgilar bazada (admin panel: /belgilar/boshqaruv — qo'shish, tahrirlash, rasm). Ilova va sayt
 * avval ichidagi nusxani (belgilar.json — bazaga ham shundan yuklangan) darhol ko'rsatadi, so'ng
 * serverdagi ro'yxat bilan almashtiradi; internet bo'lmasa — oxirgi olingan ro'yxat yoki ichki nusxa.
 */
import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../api';
import data from './belgilar.json';

export interface Toifa {
  n: number;
  nom: string;
  tavsif: string;
}
/** Bitta belgi (bitta raqam). Guruhli belgilar (1.4.1 — 1.4.6) — nomi va tavsifi bir xil alohida qatorlar */
export interface BelgiQator {
  id?: number;
  toifa: number;
  /** "1.1", "1.4.3"; taniqlik belgilarida ichki "T1"… (ko'rsatilmaydi) */
  raqam: string;
  nom: string;
  tavsif: string;
  /** "/belgi-rasm/1.1.svg" (ilova/sayt ichida) yoki "/api/signs/:id/image?v=…" (admin yuklagan); yo'q bo'lsa null */
  rasm: string | null;
}

export const TOIFALAR = data.toifalar as Toifa[];

/** Ichki nusxa: belgilar.json — har bir raqam alohida qator */
export const ICHKI_BELGILAR: BelgiQator[] = (data.belgilar as { toifa: number; nom: string; tavsif: string; rasmlar: { raqam: string; fayl: string | null }[] }[])
  .flatMap((b) => b.rasmlar.map((r) => ({ toifa: b.toifa, raqam: r.raqam, nom: b.nom, tavsif: b.tavsif, rasm: r.fayl ? `/belgi-rasm/${r.fayl}` : null })));

/** Rasm manzili: ichki fayllar — ilova/sayt ildizidan, admin yuklaganlari — serverdan */
export function belgiRasmUrl(rasm: string): string {
  if (rasm.startsWith('/belgi-rasm/')) return `${(import.meta as any).env?.BASE_URL || '/'}${rasm.slice(1)}`;
  return mediaUrl(rasm) || rasm;
}

/** Taniqlik belgilarining rasmiy raqami yo'q (ichki T1, T2…) — ko'rsatilmaydi */
export const raqamKorinadi = (raqam: string) => !!raqam && !/^T\d/.test(raqam);

/** Raqamni tabiiy tartibda: 1.2 < 1.10; raqamsizlar oxirida (serverdagi tartib bilan bir xil — apps/api/src/belgilar.ts) */
export function raqamSolishtir(a: string, b: string): number {
  if (!a !== !b) return a ? -1 : 1;
  const pa = a.match(/\d+/g)?.map(Number) || [];
  const pb = b.match(/\d+/g)?.map(Number) || [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return a.localeCompare(b);
}
export const belgiTartibi = (a: BelgiQator, b: BelgiQator) =>
  a.toifa - b.toifa || raqamSolishtir(a.raqam, b.raqam) || (a.id ?? 0) - (b.id ?? 0);

/** Bir xil nomli belgilar (1.4.1 — 1.4.6) — batafsil oynada birga ko'rsatiladi */
export const guruhi = (royxat: BelgiQator[], b: BelgiQator) => royxat.filter((x) => x.toifa === b.toifa && x.nom === b.nom);

/** Guruh raqami: "1.4.1 — 1.4.6" yoki "1.1"; ko'rinmaydigan raqamlar tashlanadi */
export function guruhRaqami(gr: BelgiQator[]): string {
  const rr = gr.map((x) => x.raqam).filter(raqamKorinadi);
  return rr.length > 1 ? `${rr[0]} — ${rr[rr.length - 1]}` : rr[0] || '';
}

let oxirgi: BelgiQator[] | null = null;

/** Belgilar ro'yxati: darhol (oxirgi/ichki nusxa), keyin serverdan yangisi */
export function useBelgilar(): BelgiQator[] {
  const [royxat, setRoyxat] = useState<BelgiQator[]>(() => oxirgi || ICHKI_BELGILAR);
  useEffect(() => {
    let tirik = true;
    api.signs()
      .then((r: BelgiQator[]) => {
        // Server bo'sh yoki eski formatda ({name, category…}) — ichki nusxa qoladi
        if (!Array.isArray(r) || !r.length || !r.every((b) => b && b.toifa > 0 && typeof b.nom === 'string')) return;
        oxirgi = r;
        if (tirik) setRoyxat(r);
      })
      .catch(() => {});
    return () => { tirik = false; };
  }, []);
  return royxat;
}
