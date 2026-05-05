import { useState } from "react";
import AnswerResult from "../AnswerResult";
import { answerToText } from "../../lib/answerJudge";
import type { QuestionComponentProps } from "./questionProps";

export default function ShortAnswerQuestion({
  question,
  disabled,
  onAnswered
}: QuestionComponentProps) {
  const [answer, setAnswer] = useState("");
  const [showReference, setShowReference] = useState(false);
  const standard = answerToText(question.answer);
  const keywordHints = getShortAnswerKeywordHints(standard, question.question);

  return (
    <div>
      <div className="rounded-2xl bg-slate-50 p-5">
        <div className="text-sm font-bold text-equipment-700">简答题</div>
        <h1 className="mt-2 text-2xl font-black leading-9 text-slate-900">
          {question.question}
        </h1>
        <div className="mt-4 rounded-xl bg-white p-4">
          <div className="text-sm font-black text-slate-700">关键词提示</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {keywordHints.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-700"
              >
                {keyword}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-500">
            先围绕这些关键词写出分点答案，再点“显示参考答案”对照。
          </div>
        </div>
      </div>
      <textarea
        className="input mt-6 min-h-40"
        placeholder="先写下自己的答题要点，再查看参考答案..."
        value={answer}
        disabled={disabled}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="btn-primary"
          disabled={!answer.trim()}
          onClick={() => setShowReference(true)}
        >
          显示参考答案
        </button>
        {showReference ? (
          <>
            <button
              className="btn-secondary border-green-200 text-green-700 hover:bg-green-50"
              disabled={disabled}
              onClick={() => onAnswered({ status: "correct", userAnswer: answer })}
            >
              我答对了
            </button>
            <button
              className="btn-secondary border-amber-200 text-amber-700 hover:bg-amber-50"
              disabled={disabled}
              onClick={() => onAnswered({ status: "partial", userAnswer: answer })}
            >
              半对 / 需要复习
            </button>
            <button
              className="btn-secondary border-red-200 text-red-700 hover:bg-red-50"
              disabled={disabled}
              onClick={() => onAnswered({ status: "wrong", userAnswer: answer })}
            >
              我答错了
            </button>
          </>
        ) : null}
      </div>
      {showReference ? (
        <AnswerResult
          status="partial"
          message="请对照参考答案自行判定"
          expected={standard}
          explanation={question.explanation}
        />
      ) : null}
    </div>
  );
}

function getShortAnswerKeywordHints(answer: string, question: string): string[] {
  const text = `${question} ${answer}`.replace(/\s+/g, " ");
  const keywords = new Set<string>();
  const domainTerms = [
    "组成",
    "作用",
    "目的",
    "条件",
    "原则",
    "方法",
    "特点",
    "分类",
    "区别",
    "要求",
    "热量",
    "热散失",
    "通风量",
    "正压",
    "负压",
    "给水",
    "排水",
    "通气",
    "消防",
    "空调",
    "供暖",
    "电位联结",
    "电源",
    "负荷",
    "水封",
    "水压",
    "新风",
    "机械排风"
  ];

  const phraseCandidates = answer
    .split(/[。；;：:，,、\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .map((item) =>
      item
        .replace(/^(是|为|对|在|将|把|用来|用于|通过|利用|具有|包括|主要是|首先|其次)/, "")
        .replace(/(的|了|中|时|上|下|内|外)$/g, "")
        .trim()
    )
    .filter((item) => item.length >= 2 && item.length <= 10);

  for (const term of domainTerms) {
    if (text.includes(term)) {
      keywords.add(term);
    }
  }

  for (const phrase of phraseCandidates) {
    keywords.add(phrase);
    if (keywords.size >= 8) break;
  }

  if (!keywords.size) {
    const fallback = question
      .replace(/^简述|^说明|^试述|^论述/, "")
      .replace(/[？?]/g, "")
      .trim()
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
    fallback.forEach((item) => keywords.add(item));
  }

  return Array.from(keywords).slice(0, 8);
}
