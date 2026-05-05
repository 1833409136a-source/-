import { Bookmark, RotateCcw, Shuffle, SkipForward, Star } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import QuestionCard from "../components/QuestionCard";
import BlankQuestion from "../components/questions/BlankQuestion";
import ConceptQuestion from "../components/questions/ConceptQuestion";
import ShortAnswerQuestion from "../components/questions/ShortAnswerQuestion";
import SingleChoiceQuestion from "../components/questions/SingleChoiceQuestion";
import TrueFalseQuestion from "../components/questions/TrueFalseQuestion";
import type { AnswerPayload } from "../components/questions/questionProps";
import type { Question } from "../types/question";
import type { UserQuestionRecord } from "../types/record";
import {
  filterQuestionsByMode,
  getQuestionTypeLabel,
  isQuestionType,
  shuffleQuestions,
  type PracticeMode
} from "../lib/questionUtils";
import {
  getAllQuestions,
  getAllRecords,
  recordPractice,
  toggleFavorite,
  toggleImportant
} from "../lib/storage";

export default function Practice() {
  const [params] = useSearchParams();
  const mode = parseMode(params.get("mode"));
  const startId = params.get("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [records, setRecords] = useState<Map<string, UserQuestionRecord>>(new Map());
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<AnswerPayload | null>(null);
  const current = questions[index];

  const loadSession = useCallback(async () => {
    const [allQuestions, allRecords] = await Promise.all([
      getAllQuestions(),
      getAllRecords()
    ]);
    const filtered = filterQuestionsByMode(allQuestions, allRecords, mode);
    const ordered = shuffleQuestions(filtered);
    const limited = mode === "random" ? ordered.slice(0, 50) : ordered;
    if (startId) {
      limited.sort((first, second) => {
        if (first.id === startId) return -1;
        if (second.id === startId) return 1;
        return 0;
      });
    }
    setQuestions(limited);
    setRecords(new Map(allRecords.map((record) => [record.questionId, record])));
    setIndex(0);
    setAnswered(null);
  }, [mode, startId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const modeTitle = useMemo(() => getModeTitle(mode), [mode]);
  const currentRecord = current ? records.get(current.id) : undefined;

  async function handleAnswered(payload: AnswerPayload) {
    if (!current || answered) {
      return;
    }
    setAnswered(payload);
    const record = await recordPractice(current, payload.status, payload.userAnswer);
    setRecords((previous) => new Map(previous).set(current.id, record));
  }

  async function handleToggleFavorite() {
    if (!current) return;
    const record = await toggleFavorite(current.id);
    setRecords((previous) => new Map(previous).set(current.id, record));
  }

  async function handleToggleImportant() {
    if (!current) return;
    const record = await toggleImportant(current.id);
    setRecords((previous) => new Map(previous).set(current.id, record));
  }

  function nextQuestion() {
    setAnswered(null);
    setIndex((value) => Math.min(value + 1, questions.length));
  }

  function restart() {
    setAnswered(null);
    setIndex(0);
    setQuestions((value) => shuffleQuestions(value));
  }

  if (!questions.length) {
    return (
      <div className="panel p-8 text-center">
        <div className="text-2xl font-black text-slate-900">当前模式没有可练习题目</div>
        <p className="mt-3 text-sm text-slate-500">
          可以先去题库管理导入建筑设备题库，或回到首页选择其他练习模式。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/bank" className="btn-primary">
            题库管理
          </Link>
          <Link to="/" className="btn-secondary">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="panel p-8 text-center">
        <div className="text-2xl font-black text-slate-900">本轮练习完成</div>
        <p className="mt-3 text-sm text-slate-500">
          本轮共 {questions.length} 道题。可以重新开始，也可以查看错题本和统计。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn-primary" onClick={restart}>
            <RotateCcw size={18} />
            重新开始
          </button>
          <Link to="/wrong-book" className="btn-secondary">
            错题回顾
          </Link>
          <Link to="/stats" className="btn-secondary">
            学习统计
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-bold text-equipment-700">{modeTitle}</div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">开始建筑设备刷题</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={restart}>
            <Shuffle size={17} />
            重新开始本轮
          </button>
          <button className="btn-secondary" onClick={nextQuestion}>
            <SkipForward size={17} />
            跳过
          </button>
        </div>
      </div>

      <QuestionCard
        question={current}
        progress={`${index + 1} / ${questions.length}`}
        actions={
          <>
            <button
              className={[
                "btn-secondary",
                currentRecord?.isFavorite ? "border-amber-200 bg-amber-50 text-amber-700" : ""
              ].join(" ")}
              onClick={handleToggleFavorite}
            >
              <Star size={17} />
              {currentRecord?.isFavorite ? "已收藏" : "收藏"}
            </button>
            <button
              className={[
                "btn-secondary",
                currentRecord?.isImportant
                  ? "border-equipment-200 bg-equipment-50 text-equipment-700"
                  : ""
              ].join(" ")}
              onClick={handleToggleImportant}
            >
              <Bookmark size={17} />
              {currentRecord?.isImportant ? "已重点" : "标重点"}
            </button>
          </>
        }
      >
        {renderQuestion(current, Boolean(answered), handleAnswered)}
        {answered ? (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button className="btn-primary" onClick={nextQuestion}>
              下一题
            </button>
          </div>
        ) : null}
      </QuestionCard>
    </div>
  );
}

function renderQuestion(
  question: Question,
  disabled: boolean,
  onAnswered: (payload: AnswerPayload) => void
) {
  const props = { key: question.id, question, disabled, onAnswered };
  switch (question.type) {
    case "concept":
      return <ConceptQuestion {...props} />;
    case "blank":
      return <BlankQuestion {...props} />;
    case "true_false":
      return <TrueFalseQuestion {...props} />;
    case "single_choice":
      return <SingleChoiceQuestion {...props} />;
    case "short_answer":
      return <ShortAnswerQuestion {...props} />;
    default:
      return <div>暂不支持的题型</div>;
  }
}

function parseMode(value: string | null): PracticeMode {
  if (!value) return "random";
  if (isQuestionType(value)) return value;
  if (
    value === "all" ||
    value === "wrong" ||
    value === "favorite" ||
    value === "important" ||
    value === "unpracticed" ||
    value === "random"
  ) {
    return value;
  }
  return "random";
}

function getModeTitle(mode: PracticeMode): string {
  if (isQuestionType(mode)) {
    return getQuestionTypeLabel(mode);
  }
  const labels: Record<string, string> = {
    random: "全部题目随机练习",
    all: "全部题目顺序练习",
    wrong: "只练错题",
    favorite: "只练收藏题",
    important: "只练重点题",
    unpracticed: "只练未做题"
  };
  return labels[mode] ?? "随机练习";
}
