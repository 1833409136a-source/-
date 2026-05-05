import { useState } from "react";
import AnswerResult from "../AnswerResult";
import { judgeSingleChoice } from "../../lib/answerJudge";
import type { QuestionComponentProps } from "./questionProps";

const letters = ["A", "B", "C", "D", "E", "F"];

export default function SingleChoiceQuestion({
  question,
  disabled,
  onAnswered
}: QuestionComponentProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const expected = String(question.answer || "").toUpperCase();

  function choose(letter: string) {
    const result = judgeSingleChoice(letter, question.answer);
    setSelected(letter);
    setIsCorrect(result.isCorrect);
    onAnswered({ status: result.isCorrect ? "correct" : "wrong", userAnswer: letter });
  }

  return (
    <div>
      <h1 className="text-xl font-black leading-8 text-slate-900 sm:text-2xl">
        {question.question}
      </h1>
      <div className="mt-6 grid gap-3">
        {(question.options ?? []).map((option, index) => {
          const letter = letters[index] ?? String(index + 1);
          const isExpected = letter === expected;
          const isSelected = letter === selected;
          return (
            <button
              key={`${letter}-${option}`}
              className={[
                "flex items-start gap-3 rounded-2xl border px-4 py-4 text-left transition",
                isCorrect !== null && isExpected
                  ? "border-green-300 bg-green-50 text-green-800"
                  : isCorrect !== null && isSelected
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-equipment-300 hover:bg-equipment-50"
              ].join(" ")}
              disabled={disabled}
              onClick={() => choose(letter)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black">
                {letter}
              </span>
              <span className="pt-1 font-semibold leading-6">{option}</span>
            </button>
          );
        })}
      </div>
      {question.options?.length ? null : (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          这道选择题没有解析到选项，请到题库管理中检查原始 JSON。
        </div>
      )}
      {isCorrect !== null ? (
        <AnswerResult
          status={isCorrect ? "correct" : "wrong"}
          expected={expected}
          explanation={question.explanation}
        />
      ) : null}
    </div>
  );
}
