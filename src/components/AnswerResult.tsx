import { CheckCircle2, CircleDotDashed, XCircle } from "lucide-react";
import type { PracticeStatus } from "../types/record";

interface AnswerResultProps {
  status: PracticeStatus;
  expected?: string;
  explanation?: string;
  message?: string;
}

export default function AnswerResult({
  status,
  expected,
  explanation,
  message
}: AnswerResultProps) {
  const config = {
    correct: {
      icon: CheckCircle2,
      title: "回答正确",
      className: "border-green-200 bg-green-50 text-green-800"
    },
    wrong: {
      icon: XCircle,
      title: "需要复习",
      className: "border-red-200 bg-red-50 text-red-800"
    },
    partial: {
      icon: CircleDotDashed,
      title: "半对 / 需要复习",
      className: "border-amber-200 bg-amber-50 text-amber-800"
    }
  }[status];
  const Icon = config.icon;

  return (
    <div className={`mt-5 rounded-2xl border p-4 ${config.className}`}>
      <div className="flex items-center gap-2 font-bold">
        <Icon size={20} />
        {message || config.title}
      </div>
      {expected ? (
        <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
          <span className="font-bold">标准答案：</span>
          {expected}
        </div>
      ) : null}
      {explanation ? (
        <div className="mt-2 whitespace-pre-wrap text-sm leading-7">
          <span className="font-bold">解析：</span>
          {explanation}
        </div>
      ) : null}
    </div>
  );
}
