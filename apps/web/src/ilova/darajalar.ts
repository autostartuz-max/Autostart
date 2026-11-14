/**
 * Daraja tizimi (ilova): nomlar, chegaralar va har daraja qahramoni.
 * Server bilan bir xil bo'lsin — apps/api/src/ball.ts (DARAJALAR).
 */
export interface DarajaMalumot {
  nom: string;
  dan: number;
  /** Tabrikda chiqib keladigan qahramon */
  qahramon: string;
  /** Tabrik matni oxiri: "… darajasiga chiqdingiz! {shior}" */
  shior: string;
}

export const DARAJALAR: DarajaMalumot[] = [
  { nom: 'Piyoda', dan: 0, qahramon: '🚶', shior: 'Yo‘l boshlandi!' },
  { nom: 'Velosipedchi', dan: 250, qahramon: '🚴', shior: 'Pedalni bosing — oldinga!' },
  { nom: 'Skuterchi', dan: 500, qahramon: '🛵', shior: 'Tezlik oshyapti!' },
  { nom: 'Haydovchi', dan: 1000, qahramon: '🚗', shior: 'Rulni qo‘lga oldingiz!' },
  { nom: 'Pilot', dan: 2000, qahramon: '🏎️', shior: 'Siz eng yuqori darajadasiz!' },
];

export const darajaIndeksi = (nom?: string | null) => DARAJALAR.findIndex((d) => d.nom === nom);

/** Tabrik so'raladigan hodisa (api.ts → ilova/DarajaTabrik.tsx) */
export const DARAJA_OSHDI = 'daraja:oshdi';
