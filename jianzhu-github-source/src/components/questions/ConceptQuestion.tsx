import { useState } from "react";
import AnswerResult from "../AnswerResult";
import { answerToText, judgeConceptAnswer } from "../../lib/answerJudge";
import type { QuestionComponentProps } from "./questionProps";

export default function ConceptQuestion({
  question,
  disabled,
  onAnswered
}: QuestionComponentProps) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const standardAnswer = answerToText(question.answer);
  const conceptName = question.question.replace(/^请解释[:：]\s*/, "").trim();
  const keywordHints = getConceptKeywordHints(standardAnswer, conceptName);
  const result = checked
    ? judgeConceptAnswer(answer, standardAnswer)
    : null;

  return (
    <div>
      <div className="rounded-2xl bg-equipment-50 p-5">
        <div className="text-sm font-bold text-equipment-700">概念题</div>
        <h1 className="mt-2 text-2xl font-black leading-9 text-slate-900">
          {conceptName}
        </h1>
        <div className="mt-4 rounded-xl bg-white/80 p-4">
          <div className="text-sm font-black text-slate-700">关键词提示</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {keywordHints.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-equipment-200 bg-white px-3 py-1 text-sm font-bold text-equipment-800"
              >
                {keyword}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-500">
            按这些关键词组织 2-3 句话即可，不需要一字不差背完整定义。
          </div>
        </div>
      </div>
      <textarea
        className="input mt-6 min-h-36"
        placeholder="根据上面的关键词，用自己的话写出这个建筑设备概念..."
        value={answer}
        disabled={disabled}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="btn-primary"
          disabled={disabled || !answer.trim()}
          onClick={() => setChecked(true)}
        >
          提交并显示参考答案
        </button>
        {checked ? (
          <>
            <button
              className="btn-secondary border-green-200 text-green-700 hover:bg-green-50"
              disabled={disabled}
              onClick={() => onAnswered({ status: "correct", userAnswer: answer })}
            >
              我答对了
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
      {result ? (
        <AnswerResult
          status={result.isCorrect ? "correct" : "wrong"}
          message={result.message}
          expected={standardAnswer}
          explanation={
            result.matched?.length
              ? `已匹配关键片段：${result.matched.join("、")}`
              : question.explanation
          }
        />
      ) : null}
    </div>
  );
}

function getConceptKeywordHints(answer: string, conceptName: string): string[] {
  const normalizedAnswer = answer.replace(/\s+/g, "");
  const domainTerms = [
    "引入管",
    "水表",
    "阀门",
    "泄水装置",
    "汇水面积",
    "雨水量",
    "降雨量",
    "供水温度",
    "水加热器",
    "空调系统",
    "正压",
    "围护结构",
    "通风",
    "排风",
    "给水",
    "排水",
    "供暖",
    "热水",
    "消防",
    "压力",
    "流量",
    "管道",
    "设备",
    "系统",
    "装置",
    "作用",
    "组成",
    "总称",
    "比值",
    "出口温度"
  ];
  const hints = new Set<string>();

  if (conceptName) {
    hints.add(conceptName);
  }

  for (const term of domainTerms) {
    if (normalizedAnswer.includes(term)) {
      hints.add(term);
    }
  }

  for (const phrase of answer
    .split(/[，。；、：:,.；;（）()]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)) {
    const cleaned = phrase
      .replace(/^(是|指|为|在|对|把|由|用来|用于|利用|通过|及其|以及)/, "")
      .replace(/(的|了|时|中|上|下|内|外|而|和|或|与|及)$/g, "")
      .trim();
    if (cleaned.length >= 3 && cleaned.length <= 10) {
      hints.add(cleaned);
    }
    if (hints.size >= 6) {
      break;
    }
  }

  return Array.from(hints).slice(0, 6);
}
