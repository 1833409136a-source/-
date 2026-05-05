export type QuestionType =
  | "concept"
  | "blank"
  | "true_false"
  | "single_choice"
  | "short_answer";

export type Difficulty = "easy" | "medium" | "hard";

export type QuestionAnswer = string | string[] | boolean;

export interface Question {
  id: string;
  course: "建筑设备";
  chapter?: string;
  module?: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: QuestionAnswer;
  explanation?: string;
  sourceFile?: string;
  tags?: string[];
  difficulty?: Difficulty;
  parseWarning?: string;
}
