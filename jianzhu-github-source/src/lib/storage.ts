import Dexie, { type Table } from "dexie";
import exampleBank from "../data/example-building-equipment-bank.json";
import parsedBank from "../data/building-equipment-question-bank.json";
import type { Question, QuestionAnswer } from "../types/question";
import type {
  PracticeAttempt,
  PracticeStatus,
  UserQuestionRecord
} from "../types/record";
import { QUESTION_TYPE_TAGS, countByType, getDateKey } from "./questionUtils";

class BuildingEquipmentQuizDB extends Dexie {
  questions!: Table<Question, string>;
  records!: Table<UserQuestionRecord, string>;
  attempts!: Table<PracticeAttempt, number>;

  constructor() {
    super("buildingEquipmentQuizDB");
    this.version(1).stores({
      questions: "id,type,chapter,module,sourceFile,*tags",
      records:
        "questionId,isFavorite,isImportant,isInWrongBook,lastPracticedAt",
      attempts: "++id,questionId,type,status,practicedAt"
    });
  }
}

export const db = new BuildingEquipmentQuizDB();

const initialParsedBank = parsedBank as Question[];
const initialExampleBank = exampleBank as Question[];
const bundledQuestions = initialParsedBank.length ? initialParsedBank : initialExampleBank;
const bundledBankSignature = [
  bundledQuestions.length,
  bundledQuestions[0]?.id ?? "empty",
  bundledQuestions[bundledQuestions.length - 1]?.id ?? "empty"
].join(":");
const bundledBankStorageKey = "buildingEquipmentQuizBundledBankSignature";

export async function seedInitialQuestions(): Promise<void> {
  const count = await db.questions.count();
  const syncedSignature = readLocalStorage(bundledBankStorageKey);

  if (count > 0 && syncedSignature === bundledBankSignature) {
    return;
  }

  await db.questions.bulkPut(bundledQuestions);
  writeLocalStorage(bundledBankStorageKey, bundledBankSignature);
}

function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(key);
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, value);
}

export async function getAllQuestions(): Promise<Question[]> {
  await seedInitialQuestions();
  return db.questions.toArray();
}

export async function getAllRecords(): Promise<UserQuestionRecord[]> {
  return db.records.toArray();
}

export async function getAllAttempts(): Promise<PracticeAttempt[]> {
  return db.attempts.toArray();
}

export async function importQuestions(
  questions: Question[],
  replace = false
): Promise<number> {
  if (replace) {
    await db.questions.clear();
  }
  await db.questions.bulkPut(questions);
  return questions.length;
}

export async function clearQuestionBank(): Promise<void> {
  await db.questions.clear();
}

export async function clearLearningRecords(): Promise<void> {
  await db.transaction("rw", db.records, db.attempts, async () => {
    await db.records.clear();
    await db.attempts.clear();
  });
}

export function makeEmptyRecord(questionId: string): UserQuestionRecord {
  return {
    questionId,
    practicedCount: 0,
    correctCount: 0,
    wrongCount: 0,
    partialCount: 0,
    lastAnswer: null,
    lastIsCorrect: null,
    lastPracticedAt: null,
    isFavorite: false,
    isImportant: false,
    isInWrongBook: false
  };
}

export async function getRecord(
  questionId: string
): Promise<UserQuestionRecord | undefined> {
  return db.records.get(questionId);
}

export async function recordPractice(
  question: Question,
  status: PracticeStatus,
  userAnswer: QuestionAnswer | null
): Promise<UserQuestionRecord> {
  const now = new Date().toISOString();
  const current = (await db.records.get(question.id)) ?? makeEmptyRecord(question.id);
  const isCorrect = status === "correct" ? true : status === "wrong" ? false : null;

  const next: UserQuestionRecord = {
    ...current,
    practicedCount: current.practicedCount + 1,
    correctCount: current.correctCount + (status === "correct" ? 1 : 0),
    wrongCount: current.wrongCount + (status === "wrong" ? 1 : 0),
    partialCount: (current.partialCount ?? 0) + (status === "partial" ? 1 : 0),
    lastAnswer: userAnswer,
    lastIsCorrect: isCorrect,
    lastPracticedAt: now,
    isInWrongBook: status === "correct" ? current.isInWrongBook : true
  };

  const attempt: PracticeAttempt = {
    questionId: question.id,
    type: question.type,
    status,
    isCorrect,
    userAnswer,
    practicedAt: now
  };

  await db.transaction("rw", db.records, db.attempts, async () => {
    await db.records.put(next);
    await db.attempts.add(attempt);
  });

  return next;
}

async function updateRecordFlag(
  questionId: string,
  field: "isFavorite" | "isImportant",
  value?: boolean
): Promise<UserQuestionRecord> {
  const current = (await db.records.get(questionId)) ?? makeEmptyRecord(questionId);
  const next = {
    ...current,
    [field]: typeof value === "boolean" ? value : !current[field]
  };
  await db.records.put(next);
  return next;
}

export function toggleFavorite(questionId: string, value?: boolean) {
  return updateRecordFlag(questionId, "isFavorite", value);
}

export function toggleImportant(questionId: string, value?: boolean) {
  return updateRecordFlag(questionId, "isImportant", value);
}

export async function removeFromWrongBook(questionId: string): Promise<void> {
  const current = (await db.records.get(questionId)) ?? makeEmptyRecord(questionId);
  await db.records.put({ ...current, isInWrongBook: false });
}

export async function getDashboardStats() {
  const [questions, records, attempts] = await Promise.all([
    getAllQuestions(),
    getAllRecords(),
    getAllAttempts()
  ]);
  const todayKey = getDateKey(new Date());
  const correctAttempts = attempts.filter((attempt) => attempt.status === "correct");
  const answeredAttempts = attempts.length;
  const practicedTimes = attempts
    .map((attempt) => attempt.practicedAt)
    .sort();
  const latestAttempt = practicedTimes[practicedTimes.length - 1];

  return {
    totalQuestions: questions.length,
    byType: countByType(questions),
    practicedQuestions: records.filter((record) => record.practicedCount > 0).length,
    totalPracticeCount: attempts.length,
    correctRate: answeredAttempts
      ? Math.round((correctAttempts.length / answeredAttempts) * 100)
      : 0,
    wrongBookCount: records.filter((record) => record.isInWrongBook).length,
    favoriteCount: records.filter((record) => record.isFavorite).length,
    importantCount: records.filter((record) => record.isImportant).length,
    todayCount: attempts.filter(
      (attempt) => getDateKey(new Date(attempt.practicedAt)) === todayKey
    ).length,
    latestPracticedAt: latestAttempt ?? null
  };
}

export async function getWrongBookItems() {
  const [questions, records] = await Promise.all([getAllQuestions(), getAllRecords()]);
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  return records
    .filter((record) => record.isInWrongBook)
    .map((record) => ({
      record,
      question: questionMap.get(record.questionId)
    }))
    .filter(
      (item): item is { record: UserQuestionRecord; question: Question } =>
        Boolean(item.question)
    )
    .sort((first, second) => second.record.wrongCount - first.record.wrongCount);
}

export async function getFullStats() {
  const [questions, records, attempts] = await Promise.all([
    getAllQuestions(),
    getAllRecords(),
    getAllAttempts()
  ]);
  const perType = QUESTION_TYPE_TAGS.map((type) => {
    const typeAttempts = attempts.filter((attempt) => attempt.type === type);
    const correct = typeAttempts.filter((attempt) => attempt.status === "correct")
      .length;
    return {
      type,
      totalQuestions: questions.filter((question) => question.type === type).length,
      practiceCount: typeAttempts.length,
      correctRate: typeAttempts.length
        ? Math.round((correct / typeAttempts.length) * 100)
        : 0
    };
  });

  const weakType = perType
    .filter((item) => item.practiceCount > 0)
    .sort((first, second) => first.correctRate - second.correctRate)[0];

  const last7Days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const key = getDateKey(date);
    return {
      date: key,
      count: attempts.filter(
        (attempt) => getDateKey(new Date(attempt.practicedAt)) === key
      ).length
    };
  });

  const topWrong = records
    .filter((record) => record.wrongCount > 0 || (record.partialCount ?? 0) > 0)
    .sort(
      (first, second) =>
        second.wrongCount +
        (second.partialCount ?? 0) -
        (first.wrongCount + (first.partialCount ?? 0))
    )
    .slice(0, 10);

  return {
    questions,
    records,
    attempts,
    perType,
    weakType,
    last7Days,
    topWrong
  };
}
