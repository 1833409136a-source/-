import { useMemo, useState } from "react";
import AnswerResult from "../AnswerResult";
import { answerToText, judgeBlankAnswers } from "../../lib/answerJudge";
import type { QuestionComponentProps } from "./questionProps";

export default function BlankQuestion({
  question,
  disabled,
  onAnswered
}: QuestionComponentProps) {
  const answerCount = useMemo(() => {
    const blanks = question.question.match(/____/g)?.length ?? 0;
    const standardCount = Array.isArray(question.answer) ? question.answer.length : 1;
    return Math.max(blanks, standardCount, 1);
  }, [question]);
  const [answers, setAnswers] = useState<string[]>(() => Array(answerCount).fill(""));
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const parts = question.question.split(/____/g);

  function submit() {
    const result = judgeBlankAnswers(answers, question.answer);
    setIsCorrect(result.isCorrect);
    onAnswered({
      status: result.isCorrect ? "correct" : "wrong",
      userAnswer: answers
    });
  }

  return (
    <div>
      <div className="rounded-2xl bg-slate-50 p-5 text-lg font-bold leading-10 text-slate-900">
        {parts.map((part, index) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < answerCount ? (
              <input
                className="mx-2 inline-flex min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-base outline-none focus:border-equipment-500"
                value={answers[index] ?? ""}
                disabled={disabled}
                onChange={(event) => {
                  const next = [...answers];
                  next[index] = event.target.value;
                  setAnswers(next);
                }}
                aria-label={`第 ${index + 1} 个空`}
              />
            ) : null}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="btn-primary"
          disabled={disabled || answers.every((item) => !item.trim())}
          onClick={submit}
        >
          提交答案
        </button>
      </div>
      {isCorrect !== null ? (
        <AnswerResult
          status={isCorrect ? "correct" : "wrong"}
          expected={answerToText(question.answer)}
          explanation={question.explanation}
        />
      ) : null}
    </div>
  );
}
