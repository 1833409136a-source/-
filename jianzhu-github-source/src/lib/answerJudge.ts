import type { QuestionAnswer } from "../types/question";

export interface JudgeResult {
  isCorrect: boolean;
  message: string;
  expected: string;
  matched?: string[];
}

export function normalizeAnswer(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[，]/g, ",")
    .replace(/[。]/g, ".")
    .replace(/[；]/g, ";")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .toLowerCase();
}

export function answerToText(answer: QuestionAnswer | null | undefined): string {
  if (Array.isArray(answer)) {
    return answer.join("；");
  }
  if (typeof answer === "boolean") {
    return answer ? "正确" : "错误";
  }
  return String(answer ?? "");
}

export function judgeExactText(
  userAnswer: string,
  standardAnswer: string
): JudgeResult {
  const user = normalizeAnswer(userAnswer);
  const standard = normalizeAnswer(standardAnswer);
  const isCorrect = Boolean(user) && user === standard;
  return {
    isCorrect,
    message: isCorrect ? "回答正确" : "回答不一致，请核对标准答案",
    expected: standardAnswer
  };
}

export function judgeBlankAnswers(
  userAnswers: string[],
  standardAnswer: QuestionAnswer
): JudgeResult {
  const standards = Array.isArray(standardAnswer)
    ? standardAnswer
    : [String(standardAnswer)];
  const normalizedUser = userAnswers.map(normalizeAnswer);
  const normalizedStandard = standards.map(normalizeAnswer);
  const isCorrect =
    normalizedStandard.length > 0 &&
    normalizedStandard.every(
      (answer, index) => normalizedUser[index] && normalizedUser[index] === answer
    );

  return {
    isCorrect,
    message: isCorrect ? "填空全部正确" : "有空未匹配标准答案",
    expected: standards.join("；")
  };
}

export function judgeConceptAnswer(
  userAnswer: string,
  standardAnswer: string
): JudgeResult {
  const user = normalizeAnswer(userAnswer);
  const standard = normalizeAnswer(standardAnswer);
  const fragments = buildConceptFragments(standard);
  const matched = fragments.filter((fragment) => user.includes(fragment));
  const isCorrect =
    Boolean(user) &&
    (user.includes(standard) ||
      standard.includes(user) ||
      matched.length >= Math.min(2, fragments.length));

  return {
    isCorrect,
    message: isCorrect
      ? "自动判定为基本正确，可按自己的掌握情况确认"
      : "自动判定为需要核对，请对照标准答案自行确认",
    expected: standardAnswer,
    matched
  };
}

function buildConceptFragments(standard: string): string[] {
  const chunks = standard
    .split(/[,.，。;；:：、]/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 4);

  const fragments = new Set<string>();
  for (const chunk of chunks.length ? chunks : [standard]) {
    if (chunk.length <= 8) {
      fragments.add(chunk);
    } else {
      fragments.add(chunk.slice(0, 6));
      const middleStart = Math.max(0, Math.floor(chunk.length / 2) - 3);
      fragments.add(chunk.slice(middleStart, middleStart + 6));
      fragments.add(chunk.slice(-6));
    }
  }
  return Array.from(fragments).filter((item) => item.length >= 4);
}

export function judgeTrueFalse(
  userAnswer: boolean,
  standardAnswer: QuestionAnswer
): JudgeResult {
  const expected = Boolean(standardAnswer);
  const isCorrect = userAnswer === expected;
  return {
    isCorrect,
    message: isCorrect ? "判断正确" : "判断错误",
    expected: expected ? "正确" : "错误"
  };
}

export function judgeSingleChoice(
  selected: string,
  standardAnswer: QuestionAnswer
): JudgeResult {
  const expected = normalizeAnswer(String(standardAnswer)).toUpperCase();
  const normalizedSelected = normalizeAnswer(selected).toUpperCase();
  const isCorrect = normalizedSelected === expected;
  return {
    isCorrect,
    message: isCorrect ? "选择正确" : "选择错误",
    expected
  };
}
