/** Svetofor ishoralari */
export type Ishora = 'yashil' | 'miltillash' | 'sariq' | 'qizil' | 'qizilSariq';

// Guruhlar: shimol–janub (0) va sharq–g'arb (1) navbatma-navbat
const GURUH: Record<string, 0 | 1> = { N: 0, S: 0, E: 1, W: 1 };
const YASHIL = 12, MILT = 3, SARIQ = 3, BARCHA_QIZIL = 1.5, QIZIL_SARIQ = 1.5;
const YARIM = YASHIL + MILT + SARIQ + BARCHA_QIZIL;   // bir guruh navbati
const DAVR = 2 * YARIM;

/** Guruhning o'z vaqtidagi (0..DAVR) ishorasi */
function ishoraVaqtda(t: number): Ishora {
  if (t < YASHIL) return 'yashil';
  if (t < YASHIL + MILT) return 'miltillash';
  if (t < YASHIL + MILT + SARIQ) return 'sariq';
  if (t >= DAVR - QIZIL_SARIQ) return 'qizilSariq';
  return 'qizil';
}

export class Svetoforlar {
  /** Umumiy sikl vaqti */
  t = Math.random() * DAVR;

  qadam(dt: number) { this.t = (this.t + dt) % DAVR; }

  private lokal(id: string) { return (this.t + (GURUH[id] ? YARIM : 0)) % DAVR; }

  ishora(id: string): Ishora { return ishoraVaqtda(this.lokal(id)); }

  /** Sariq yonganiga necha soniya bo'ldi (sariq bo'lmasa — 0) */
  sariqVaqti(id: string) {
    const l = this.lokal(id);
    return ishoraVaqtda(l) === 'sariq' ? l - YASHIL - MILT : 0;
  }

  /** Harakatni taqiqlovchi ishora: qizil, qizil+sariq yoki uzoq yongan sariq */
  taqiqlovchi(id: string, sariqChegara = 1.5) {
    const i = this.ishora(id);
    return i === 'qizil' || i === 'qizilSariq' || (i === 'sariq' && this.sariqVaqti(id) > sariqChegara);
  }

  /** Berilgan svetoforni qizil qilish: yashil yonishiga `qoldi` soniya qolsin */
  qizilQil(id: string, qoldi: number) {
    const l = DAVR - Math.min(qoldi, DAVR - YARIM - 0.5);
    this.t = (l - (GURUH[id] ? YARIM : 0) + DAVR) % DAVR;
  }

  /** Berilgan svetoforni yashil qilish: yashil yana `qoldi` soniya yonsin */
  yashilQil(id: string, qoldi: number) {
    const l = Math.max(0, YASHIL - qoldi);
    this.t = (l - (GURUH[id] ? YARIM : 0) + DAVR) % DAVR;
  }
}
