import type { QuestionAnswer, QuestionType } from "./question";

export interface UserQuestionRecord {
  questionId: string;
  practicedCount: number;
  correctCount: number;
  wrongCount: number;
  partialCount?: number;
  lastAnswer: QuestionAnswer | null;
  lastIsCorrect: boolean | null;
  lastPracticedAt: string | null;
  isFavorite: boolean;
  isImportant: boolean;
  isInWrongBook: boolean;
}

export type PracticeStatus = "correct" | "wrong" | "partial";

export interface PracticeAttempt {
  id?: number;
  questionId: string;
  type: QuestionType;
  status: PracticeStatus;
  isCorrect: boolean | null;
  userAnswer: QuestionAnswer | null;
  practicedAt: string;
}
