import { Download, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { downloadJson } from "../lib/importExport";
import {
  clearLearningRecords,
  getAllAttempts,
  getAllQuestions,
  getAllRecords,
  seedInitialQuestions
} from "../lib/storage";

export default function Settings() {
  const [message, setMessage] = useState("");

  async function exportAll() {
    const [questions, records, attempts] = await Promise.all([
      getAllQuestions(),
      getAllRecords(),
      getAllAttempts()
    ]);
    downloadJson(
      { exportedAt: new Date().toISOString(), course: "建筑设备", questions, records, attempts },
      "building-equipment-quiz-backup.json"
    );
  }

  async function resetRecords() {
    if (!window.confirm("确定清空全部学习记录吗？题库不会删除。")) return;
    await clearLearningRecords();
    setMessage("学习记录已清空。");
  }

  async function restoreSeed() {
    await seedInitialQuestions();
    setMessage("已检查并初始化示例/解析题库。");
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold text-equipment-700">Local Settings</div>
        <h1 className="mt-1 text-2xl font-black text-slate-900">设置</h1>
      </div>

      <section className="panel p-5">
        <h2 className="text-xl font-black text-slate-900">本地数据说明</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          建筑设备刷题系统不需要后端，也不需要登录。题库、错题、收藏、重点标记和练习记录都保存在当前浏览器的
          IndexedDB 中。更换浏览器或清理站点数据会导致本地记录丢失，建议考试前导出备份。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={() => void exportAll()}>
            <Download size={17} />
            导出完整备份
          </button>
          <button className="btn-secondary" onClick={() => void restoreSeed()}>
            <RefreshCcw size={17} />
            初始化题库
          </button>
          <button className="btn-danger" onClick={() => void resetRecords()}>
            <Trash2 size={17} />
            清空学习记录
          </button>
        </div>
        {message ? (
          <div className="mt-4 rounded-2xl border border-equipment-200 bg-equipment-50 p-3 text-sm font-semibold text-equipment-800">
            {message}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Info title="默认课程" text="建筑设备" />
        <Info title="数据存储" text="IndexedDB，本地浏览器保存" />
        <Info title="运行方式" text="npm install 后 npm run dev" />
      </section>
    </div>
  );
}

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="panel p-5">
      <div className="text-sm font-bold text-slate-500">{title}</div>
      <div className="mt-2 text-lg font-black text-slate-900">{text}</div>
    </div>
  );
}
