import type { Question, QuestionAnswer } from "../../types/question";
import type { PracticeStatus } from "../../types/record";

export interface AnswerPayload {
  status: PracticeStatus;
  userAnswer: QuestionAnswer | null;
}

export interface QuestionComponentProps {
  question: Question;
  disabled?: boolean;
  onAnswered: (payload: AnswerPayload) => void;
}
