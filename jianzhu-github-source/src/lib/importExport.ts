import type { Question } from "../types/question";

export function normalizeImportedQuestions(input: unknown): Question[] {
  const rawQuestions = Array.isArray(input)
    ? input
    : typeof input === "object" && input !== null && "questions" in input
      ? (input as { questions: unknown }).questions
      : [];

  if (!Array.isArray(rawQuestions)) {
    throw new Error("JSON 中没有找到题目数组。");
  }

  return rawQuestions.map((item, index) => normalizeQuestion(item, index));
}

function normalizeQuestion(item: unknown, index: number): Question {
  if (typeof item !== "object" || item === null) {
    throw new Error(`第 ${index + 1} 条题目不是有效对象。`);
  }
  const source = item as Partial<Question>;
  if (!source.type || !source.question) {
    throw new Error(`第 ${index + 1} 条题目缺少 type 或 question。`);
  }

  return {
    id: source.id || `${source.type}-${String(index + 1).padStart(3, "0")}`,
    course: "建筑设备",
    type: source.type,
    question: source.question,
    options: source.options,
    answer: source.answer ?? "",
    explanation: source.explanation,
    sourceFile: source.sourceFile,
    chapter: source.chapter,
    module: source.module,
    tags: source.tags?.length ? source.tags : [],
    difficulty: source.difficulty,
    parseWarning: source.parseWarning
  } as Question;
}

export async function readJsonFile(file: File): Promise<Question[]> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  return normalizeImportedQuestions(parsed);
}

export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
