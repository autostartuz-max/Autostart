/**
 * Avtomobillar katalogi. O'lchamlar va dvigatel ko'rsatkichlari ochiq texnik ma'lumotlarga yaqin
 * (taxminiy). Admin keyinchalik yangi avtomobil qo'sha oladi (shu tuzilmada).
 */
export type Uzatma = 'R' | 'N' | '1' | '2';

export interface MashinaTuri {
  id: string;
  nom: string;
  /** Kuzov shakli parametrlari (grafika) */
  shakl: 'cobalt' | 'gentra';
  rang: string;
  // Gabaritlar, m
  uzunlik: number;
  eni: number;
  balandlik: number;
  bazasi: number;
  koleya: number;
  oldiOsilma: number;  // old o'qdan old bamperigacha
  orqaOsilma: number;  // orqa o'qdan orqa bamperigacha
  gildirakR: number;
  /** Massa (haydovchi bilan), kg */
  massa: number;
  // Dvigatel
  salt: number;        // salt aylanish, ayl/min
  maxAyl: number;      // cheklagich
  /** Moment egri chizig'i: [ayl/min, N·m] */
  moment: [number, number][];
  uzatmalar: { R: number; '1': number; '2': number };
  bosh: number;        // bosh uzatma
  /** Old g'ildirakning eng katta burilish burchagi, gradus */
  maxBurchak: number;
  /** Rul nisbati (rul burchagi / g'ildirak burchagi) */
  rulNisbati: number;
}

export const MASHINALAR: MashinaTuri[] = [
  {
    id: 'cobalt', nom: 'Chevrolet Cobalt', shakl: 'cobalt', rang: '#e9ebee',
    uzunlik: 4.48, eni: 1.735, balandlik: 1.514, bazasi: 2.62, koleya: 1.48, oldiOsilma: 0.95, orqaOsilma: 0.91,
    gildirakR: 0.317, massa: 1240,
    salt: 800, maxAyl: 6200,
    moment: [[0, 60], [800, 98], [1500, 112], [2500, 124], [4000, 134], [5000, 128], [5800, 117], [6200, 100]],
    uzatmalar: { R: 3.25, '1': 3.545, '2': 1.904 }, bosh: 4.07,
    maxBurchak: 34, rulNisbati: 15.4,
  },
  {
    id: 'gentra', nom: 'Chevrolet Gentra', shakl: 'gentra', rang: '#1f2a3a',
    uzunlik: 4.515, eni: 1.725, balandlik: 1.445, bazasi: 2.6, koleya: 1.48, oldiOsilma: 0.95, orqaOsilma: 0.965,
    gildirakR: 0.3, massa: 1320,
    salt: 800, maxAyl: 6200,
    moment: [[0, 62], [800, 100], [1500, 118], [2500, 131], [3800, 141], [5000, 132], [5800, 120], [6200, 104]],
    uzatmalar: { R: 3.31, '1': 3.545, '2': 2.048 }, bosh: 3.94,
    maxBurchak: 35, rulNisbati: 15.0,
  },
];

export const mashinaTop = (id: string) => MASHINALAR.find((m) => m.id === id) || MASHINALAR[0];

/** Rul to'liq burilganda (bir tomonga) rul g'ildiragining burchagi, gradus */
export const rulChegara = (t: MashinaTuri) => t.maxBurchak * t.rulNisbati;
