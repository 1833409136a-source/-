import type { Question, QuestionType } from "../types/question";
import type { UserQuestionRecord } from "../types/record";
import { answerToText } from "./answerJudge";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  concept: "概念题",
  blank: "填空题",
  true_false: "判断题",
  single_choice: "选择题",
  short_answer: "简答题"
};

export const QUESTION_TYPE_TAGS: QuestionType[] = [
  "concept",
  "blank",
  "true_false",
  "single_choice",
  "short_answer"
];

export type PracticeMode =
  | "random"
  | "all"
  | "wrong"
  | "favorite"
  | "important"
  | "unpracticed"
  | QuestionType;

export function isQuestionType(value: string | null): value is QuestionType {
  return Boolean(value && QUESTION_TYPE_TAGS.includes(value as QuestionType));
}

export function getQuestionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS[type] ?? type;
}

export function shuffleQuestions(questions: Question[]): Question[] {
  const copy = [...questions];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function filterQuestionsByMode(
  questions: Question[],
  records: UserQuestionRecord[],
  mode: PracticeMode
): Question[] {
  const recordMap = new Map(records.map((record) => [record.questionId, record]));
  if (isQuestionType(mode)) {
    return questions.filter((question) => question.type === mode);
  }

  switch (mode) {
    case "wrong":
      return questions.filter((question) => recordMap.get(question.id)?.isInWrongBook);
    case "favorite":
      return questions.filter((question) => recordMap.get(question.id)?.isFavorite);
    case "important":
      return questions.filter((question) => recordMap.get(question.id)?.isImportant);
    case "unpracticed":
      return questions.filter(
        (question) => !recordMap.get(question.id)?.practicedCount
      );
    case "all":
      return questions;
    case "random":
    default:
      return questions;
  }
}

export function countByType(questions: Question[]): Record<QuestionType, number> {
  return QUESTION_TYPE_TAGS.reduce(
    (result, type) => ({
      ...result,
      [type]: questions.filter((question) => question.type === type).length
    }),
    {} as Record<QuestionType, number>
  );
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "暂无";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatAnswer(answer: Question["answer"] | null | undefined): string {
  return answerToText(answer);
}

export function inferModule(text: string): string | undefined {
  const rules: Array<[RegExp, string]> = [
    [/给水|水表|水泵|管网|水箱|水压/, "建筑给水"],
    [/排水|污水|废水|雨水|通气管|水封/, "建筑排水"],
    [/供暖|采暖|散热器|热水|膨胀水箱|锅炉/, "供暖系统"],
    [/通风|空调|风管|热压|风压|送风|排风/, "通风与空调"],
    [/照明|配电|电气|电压|防雷|接地/, "建筑电气"],
    [/消防|喷淋|消火栓|灭火/, "消防设备"]
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1];
}

export function collectModules(questions: Question[]): string[] {
  return Array.from(
    new Set(
      questions
        .map((question) => question.module)
        .filter((module): module is string => Boolean(module))
    )
  ).sort((first, second) => first.localeCompare(second, "zh-CN"));
}

export function searchableText(question: Question): string {
  return [
    question.question,
    formatAnswer(question.answer),
    question.chapter,
    question.module,
    question.sourceFile,
    ...(question.tags ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
