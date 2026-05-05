import { BarChart3, Star, Target, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import type { Question } from "../types/question";
import type { UserQuestionRecord } from "../types/record";
import { formatAnswer, getQuestionTypeLabel } from "../lib/questionUtils";
import { getFullStats } from "../lib/storage";

type FullStats = Awaited<ReturnType<typeof getFullStats>>;

export default function Stats() {
  const [stats, setStats] = useState<FullStats | null>(null);

  useEffect(() => {
    void getFullStats().then(setStats);
  }, []);

  const questionMap = useMemo(() => {
    return new Map(stats?.questions.map((question) => [question.id, question]) ?? []);
  }, [stats?.questions]);

  const correctCount =
    stats?.attempts.filter((attempt) => attempt.status === "correct").length ?? 0;
  const totalPractice = stats?.attempts.length ?? 0;
  const correctRate = totalPractice ? Math.round((correctCount / totalPractice) * 100) : 0;
  const favoriteCount = stats?.records.filter((record) => record.isFavorite).length ?? 0;
  const importantCount = stats?.records.filter((record) => record.isImportant).length ?? 0;
  const wrongCount = stats?.records.filter((record) => record.isInWrongBook).length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold text-equipment-700">Learning Stats</div>
        <h1 className="mt-1 text-2xl font-black text-slate-900">学习统计</h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总题目数"
          value={stats?.questions.length ?? 0}
          hint={`总练习 ${totalPractice} 次`}
          icon={<BarChart3 size={22} />}
        />
        <StatCard
          title="总正确率"
          value={`${correctRate}%`}
          hint="按提交次数计算"
          icon={<Target size={22} />}
        />
        <StatCard
          title="错题数量"
          value={wrongCount}
          hint="包含半对/需要复习"
          icon={<TriangleAlert size={22} />}
        />
        <StatCard
          title="收藏 / 重点"
          value={`${favoriteCount} / ${importantCount}`}
          hint="用于考前快速复盘"
          icon={<Star size={22} />}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="panel p-5">
          <h2 className="text-xl font-black text-slate-900">各题型正确率</h2>
          <div className="mt-4 space-y-3">
            {(stats?.perType ?? []).map((item) => (
              <div key={item.type} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900">
                      {getQuestionTypeLabel(item.type)}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      题库 {item.totalQuestions} 道 · 练习 {item.practiceCount} 次
                    </div>
                  </div>
                  <div className="text-2xl font-black text-equipment-700">
                    {item.correctRate}%
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-equipment-600"
                    style={{ width: `${item.correctRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            最薄弱题型：
            {stats?.weakType ? getQuestionTypeLabel(stats.weakType.type) : "暂无练习记录"}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-xl font-black text-slate-900">最近 7 天练习数量</h2>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {(stats?.last7Days ?? []).map((item) => {
              const max = Math.max(...(stats?.last7Days.map((day) => day.count) ?? [1]), 1);
              const height = Math.max(12, (item.count / max) * 130);
              return (
                <div key={item.date} className="flex flex-col items-center gap-2">
                  <div className="flex h-36 items-end">
                    <div
                      className="w-8 rounded-t-xl bg-equipment-600"
                      style={{ height }}
                      title={`${item.date}: ${item.count}`}
                    />
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    {item.date.slice(5)}
                  </div>
                  <div className="text-xs font-black text-slate-900">{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-xl font-black text-slate-900">错题 Top 10</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="px-4 py-3">题目</th>
                <th className="px-4 py-3">题型</th>
                <th className="px-4 py-3">错误/半对</th>
                <th className="px-4 py-3">标准答案</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(stats?.topWrong ?? []).map((record) => (
                <WrongRow
                  key={record.questionId}
                  record={record}
                  question={questionMap.get(record.questionId)}
                />
              ))}
              {stats?.topWrong.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    暂无错题记录。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function WrongRow({
  record,
  question
}: {
  record: UserQuestionRecord;
  question?: Question;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-semibold text-slate-800">
        {question?.question ?? record.questionId}
      </td>
      <td className="px-4 py-3 text-equipment-700">
        {question ? getQuestionTypeLabel(question.type) : "未知"}
      </td>
      <td className="px-4 py-3 text-red-700">
        {record.wrongCount} / {record.partialCount ?? 0}
      </td>
      <td className="px-4 py-3 text-slate-600">
        <div className="line-clamp-3 whitespace-pre-wrap">
          {question ? formatAnswer(question.answer) : "暂无"}
        </div>
      </td>
    </tr>
  );
}
