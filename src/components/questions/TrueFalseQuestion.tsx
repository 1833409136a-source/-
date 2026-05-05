import { useState } from "react";
import AnswerResult from "../AnswerResult";
import { judgeTrueFalse } from "../../lib/answerJudge";
import type { QuestionComponentProps } from "./questionProps";

export default function TrueFalseQuestion({
  question,
  disabled,
  onAnswered
}: QuestionComponentProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  function choose(value: boolean) {
    const result = judgeTrueFalse(value, question.answer);
    setSelected(value);
    setIsCorrect(result.isCorrect);
    onAnswered({ status: result.isCorrect ? "correct" : "wrong", userAnswer: value });
  }

  return (
    <div>
      <h1 className="text-xl font-black leading-8 text-slate-900 sm:text-2xl">
        {question.question}
      </h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            className={[
              "rounded-2xl border px-5 py-5 text-lg font-black transition",
              selected === value
                ? "border-equipment-500 bg-equipment-50 text-equipment-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-equipment-300"
            ].join(" ")}
            disabled={disabled}
            onClick={() => choose(value)}
          >
            {value ? "正确" : "错误"}
          </button>
        ))}
      </div>
      {isCorrect !== null ? (
        <AnswerResult
          status={isCorrect ? "correct" : "wrong"}
          expected={question.answer ? "正确" : "错误"}
          explanation={question.explanation}
        />
      ) : null}
    </div>
  );
}
