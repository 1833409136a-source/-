import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  ClipboardList,
  Clock3,
  Play,
  Star,
  Target,
  TriangleAlert
} from "lucide-react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import { getDashboardStats } from "../lib/storage";
import {
  QUESTION_TYPE_TAGS,
  formatDateTime,
  getQuestionTypeLabel
} from "../lib/questionUtils";
import { useEffect, useState, type ReactNode } from "react";

type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    void getDashboardStats().then(setStats);
  }, []);

  const typeCards = QUESTION_TYPE_TAGS.map((type) => ({
    type,
    label: getQuestionTypeLabel(type),
    value: stats?.byType[type] ?? 0
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-soft">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-equipment-100">
              《建筑设备》课程复习
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              把老师的 Word 题库变成可刷、可统计、可回顾的复习 App
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              支持概念题、填空题、判断题、选择题和简答题。本地 IndexedDB
              保存练习记录，不需要登录，也不依赖服务器。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/practice?mode=random" className="btn-primary">
                <Play size={18} />
                开始随机练习
              </Link>
              <Link to="/wrong-book" className="btn bg-white/10 text-white hover:bg-white/20">
                <TriangleAlert size={18} />
                错题回顾
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-slate-300">总题目</div>
              <div className="mt-2 text-3xl font-black">{stats?.totalQuestions ?? 0}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-slate-300">总正确率</div>
              <div className="mt-2 text-3xl font-black">{stats?.correctRate ?? 0}%</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-slate-300">今日练习</div>
              <div className="mt-2 text-3xl font-black">{stats?.todayCount ?? 0}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-slate-300">最近一次</div>
              <div className="mt-2 text-base font-black">
                {formatDateTime(stats?.latestPracticedAt)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="已练习题数"
          value={stats?.practicedQuestions ?? 0}
          hint={`累计提交 ${stats?.totalPracticeCount ?? 0} 次`}
          icon={<BookOpenCheck size={22} />}
        />
        <StatCard
          title="错题数量"
          value={stats?.wrongBookCount ?? 0}
          hint="答错或半对会进入错题本"
          icon={<TriangleAlert size={22} />}
        />
        <StatCard
          title="收藏题数量"
          value={stats?.favoriteCount ?? 0}
          hint="适合考试前快速回看"
          icon={<Star size={22} />}
        />
        <StatCard
          title="重点标记"
          value={stats?.importantCount ?? 0}
          hint="薄弱知识点可单独练"
          icon={<Target size={22} />}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {typeCards.map((card) => (
          <Link
            key={card.type}
            to={`/practice?mode=${card.type}`}
            className="panel p-5 transition hover:-translate-y-0.5 hover:border-equipment-200"
          >
            <div className="text-sm font-semibold text-slate-500">{card.label}</div>
            <div className="mt-3 text-3xl font-black text-slate-900">{card.value}</div>
            <div className="mt-4 text-xs font-bold text-equipment-700">按题型练习</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          to="/practice?mode=all"
          icon={<BookOpen size={20} />}
          title="按题型练习"
          text="进入练习页后可按概念、填空、判断、选择、简答复习。"
        />
        <ActionCard
          to="/bank"
          icon={<ClipboardList size={20} />}
          title="题库管理"
          text="导入 JSON、解析 docx、导出题库和学习记录。"
        />
        <ActionCard
          to="/stats"
          icon={<BarChart3 size={20} />}
          title="学习统计"
          text="查看正确率、薄弱题型、最近 7 天练习量。"
        />
        <ActionCard
          to="/practice?mode=unpracticed"
          icon={<Clock3 size={20} />}
          title="未做题"
          text="优先完成还没有练过的建筑设备题目。"
        />
      </section>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  text
}: {
  to: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link to={to} className="panel block p-5 transition hover:-translate-y-0.5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-equipment-50 text-equipment-700">
        {icon}
      </div>
      <div className="mt-4 text-lg font-black text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </Link>
  );
}
