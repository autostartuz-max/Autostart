/**
 * Daraja tizimi (ilova): nomlar, chegaralar, har daraja qahramoni va tabrik matnlari (2026-11 hujjat).
 * Server bilan bir xil bo'lsin — apps/api/src/ball.ts (DARAJALAR). Pilot — 2000 coin VA barcha
 * savollarga kamida bir marta to'g'ri javob (server tekshiradi).
 */
export interface DarajaMalumot {
  nom: string;
  dan: number;
  /** Tabrikda chiqib keladigan transport (va logotip ichidagi belgi) */
  qahramon: string;
  /** Tabrikdagi ikkinchi qator: "Sizning darajangiz — …" dan keyingi da'vat */
  shior: string;
  /** Logotip ranglari: yorug', asosiy, to'q (gardish) */
  rang: [string, string, string];
}

export const DARAJALAR: DarajaMalumot[] = [
  { nom: 'Piyoda', dan: 0, qahramon: '🚶', shior: 'Yo‘l boshlandi! To‘xtab qolmang, natija bardavomlikda!', rang: ['#8af0b6', '#13a35a', '#0b6b3b'] },
  { nom: 'Velosipedchi', dan: 250, qahramon: '🚴', shior: 'To‘xtab qolmang, natija bardavomlikda!', rang: ['#9ed0ff', '#2a7de1', '#174f99'] },
  {
    nom: 'Skuterchi', dan: 500, qahramon: '🛵',
    shior: 'Keyingi darajaga birga intilamiz. To‘xtab qolmang, natija bardavomlikda!', rang: ['#d4b4ff', '#7445d8', '#4b2a9a'],
  },
  {
    nom: 'Haydovchi', dan: 1000, qahramon: '🚗',
    shior: 'Keyingi darajaga bir qadam qoldi. To‘xtab qolmang, natija bardavomlikda!', rang: ['#ffc08f', '#ea5a2a', '#9e3415'],
  },
  { nom: 'Pilot', dan: 2000, qahramon: '🏎️', shior: 'Siz imtihonga tayyorsiz!', rang: ['#fff2a8', '#e6a700', '#a06c00'] },
];

export const darajaIndeksi = (nom?: string | null) => DARAJALAR.findIndex((d) => d.nom === nom);

/** Tabrik so'raladigan hodisa (api.ts → ilova/DarajaTabrik.tsx) */
export const DARAJA_OSHDI = 'daraja:oshdi';
