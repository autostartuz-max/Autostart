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
  explanation: string;
  ruleRef: string | null;
  difficulty: number;
  isNumeric: boolean;
  isTricky: boolean;
  hasAudio?: boolean;
  options: Option[];
  topic?: { id: number; name: string } | null;
  ticket?: { id: number; name: string } | null;
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
  };
  stats: {
    answered: number;
    correct: number;
    wrong: number;
    solvedQuestions: number;
    bookmarks: number;
    totalQuestions: number;
    accuracy: number;
  };
}
