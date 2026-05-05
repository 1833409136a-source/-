import type { ReactNode } from "react";
import type { Question } from "../types/question";
import { getQuestionTypeLabel } from "../lib/questionUtils";

interface QuestionCardProps {
  question: Question;
  progress?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function QuestionCard({
  question,
  progress,
  actions,
  children
}: QuestionCardProps) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-equipment-50 text-equipment-700">
                {getQuestionTypeLabel(question.type)}
              </span>
              {question.module ? <span className="badge">{question.module}</span> : null}
              {question.sourceFile ? (
                <span className="badge">{question.sourceFile}</span>
              ) : null}
              {progress ? <span className="badge">{progress}</span> : null}
            </div>
            {question.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {question.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
