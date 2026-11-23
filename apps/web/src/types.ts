export interface Option {
  id: number;
  textLat: string;
  textCyr: string;
  isCorrect: boolean;
  wrongReason: string | null;
  order: number;
}

export interface Question {
  id: number;
  textLat: string;
  textCyr: string;
  imageUrl: string | null;
  /** Video tushuncha (mobil ilova) — /api/questions/:id/video?v=... */
  videoUrl?: string | null;
  explanation: string;
  ruleRef: string | null;
  difficulty: number;
  isNumeric: boolean;
  isTricky: boolean;
  hasAudio?: boolean;
  /** Shablon (bilet) raqami; 1-bilet — tarifsiz ham audio/video namunasi ochiq */
  shablon?: number | null;
  options: Option[];
  topic?: { id: number; name: string } | null;
  ticket?: { id: number; name: string } | null;
  /* Faqat "Qiyin savollar" rejimida keladi — talabalarning xato ulushi */
  xatoUlushi?: number;
  xatoSoni?: number;
  jamiJavob?: number;
}

export interface Catalog {
  id: number;
  name: string;
  count: number;
}

export interface Sign {
  id: number;
  category: string;
  name: string;
  imageUrl: string | null;
  description: string;
}

export interface Me {
  user: {
    id: number;
    firstName: string;
    avatarUrl: string | null;
    alphabet: string;
    category: string;
    examDate?: string | null;
    viloyat?: string | null;
    tuman?: string | null;
  };
  stats: {
    answered: number;
    correct: number;
    wrong: number;
    solvedQuestions: number;
    bookmarks: number;
    totalQuestions: number;
    accuracy: number;
    /** Oxirgi javobi xato bo'lgan savollar soni ("Xatolarni tuzatish" ro'yxati) */
    mistakes?: number;
  };
  /** Oxirgi faol kundan beri o'tkazib yuborilgan kunlar (bugun javob bo'lsa 0) */
  otkazilgan?: number;
  tarif?: { daraja: number; joriy: { kod: 'standart' | 'silver' | 'premium'; nom: string; tugaydi: string } | null; kalit: string };
}
