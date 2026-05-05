import { RefreshCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Question } from "../types/question";
import type { UserQuestionRecord } from "../types/record";
import { formatAnswer } from "../lib/questionUtils";
import { formatDateTime, getQuestionTypeLabel } from "../lib/questionUtils";
import { getWrongBookItems, removeFromWrongBook } from "../lib/storage";

type WrongItem = { question: Question; record: UserQuestionRecord };

export default function WrongBook() {
  const [items, setItems] = useState<WrongItem[]>([]);

  async function load() {
    setItems(await getWrongBookItems());
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(questionId: string) {
    await removeFromWrongBook(questionId);
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold text-equipment-700">Wrong Book</div>
        <h1 className="mt-1 text-2xl font-black text-slate-900">错题本</h1>
      </div>

      {!items.length ? (
        <div className="panel p-8 text-center">
          <div className="text-xl font-black text-slate-900">暂无错题</div>
          <p className="mt-2 text-sm text-slate-500">
            答错或标记半对的题目会自动进入这里。
          </p>
          <Link to="/practice?mode=random" className="btn-primary mt-5">
            开始练习
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map(({ question, record }) => (
            <article key={question.id} className="panel p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge bg-red-50 text-red-700">
                      {getQuestionTypeLabel(question.type)}
                    </span>
                    {question.module ? <span className="badge">{question.module}</span> : null}
                    <span className="badge">错误 {record.wrongCount} 次</span>
                    {(record.partialCount ?? 0) > 0 ? (
                      <span className="badge">半对 {record.partialCount} 次</span>
                    ) : null}
                  </div>
                  <h2 className="mt-4 text-lg font-black leading-7 text-slate-900">
                    {question.question}
                  </h2>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <Info title="最近错误时间" text={formatDateTime(record.lastPracticedAt)} />
                    <Info title="来源文件" text={question.sourceFile || "未知"} />
                    <Info title="最近一次答案" text={formatAnswer(record.lastAnswer)} />
                    <Info title="标准答案" text={formatAnswer(question.answer)} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    to={`/practice?mode=wrong&start=${question.id}`}
                    className="btn-primary"
                  >
                    <RefreshCcw size={17} />
                    重新练习
                  </Link>
                  <button className="btn-secondary" onClick={() => remove(question.id)}>
                    <Trash2 size={17} />
                    移出错题本
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-xs font-bold text-slate-400">{title}</div>
      <div className="mt-1 whitespace-pre-wrap break-words font-semibold text-slate-700">
        {text || "暂无"}
      </div>
    </div>
  );
}
