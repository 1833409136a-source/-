import {
  Download,
  FileJson,
  FileText,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Question, QuestionType } from "../types/question";
import {
  collectModules,
  formatAnswer,
  getQuestionTypeLabel,
  QUESTION_TYPE_TAGS,
  searchableText
} from "../lib/questionUtils";
import {
  clearLearningRecords,
  clearQuestionBank,
  getAllAttempts,
  getAllQuestions,
  getAllRecords,
  importQuestions
} from "../lib/storage";
import { downloadJson, readJsonFile } from "../lib/importExport";
import { parseDocxFile } from "../lib/docxParser";

export default function BankManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<QuestionType | "all">("all");
  const [module, setModule] = useState("all");
  const [message, setMessage] = useState("");
  const [replaceImport, setReplaceImport] = useState(false);

  async function load() {
    setQuestions(await getAllQuestions());
  }

  useEffect(() => {
    void load();
  }, []);

  const modules = useMemo(() => collectModules(questions), [questions]);
  const filtered = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return questions.filter((question) => {
      const typeMatched = type === "all" || question.type === type;
      const moduleMatched = module === "all" || question.module === module;
      const keywordMatched =
        !normalizedKeyword ||
        searchableText(question).toLowerCase().includes(normalizedKeyword);
      return typeMatched && moduleMatched && keywordMatched;
    });
  }, [questions, keyword, type, module]);

  async function handleJsonImport(file?: File) {
    if (!file) return;
    try {
      const imported = await readJsonFile(file);
      await importQuestions(imported, replaceImport);
      setMessage(`已导入 ${imported.length} 道建筑设备题目。`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON 导入失败。");
    }
  }

  async function handleDocxImport(files: FileList | null) {
    if (!files?.length) return;
    try {
      const parsedGroups = await Promise.all(Array.from(files).map(parseDocxFile));
      const imported = parsedGroups.flat();
      await importQuestions(imported, replaceImport);
      const warningCount = imported.filter((question) => question.parseWarning).length;
      setMessage(
        `已从 docx 解析并导入 ${imported.length} 道题，其中 ${warningCount} 道需要人工检查。`
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "docx 解析导入失败。");
    }
  }

  async function exportRecords() {
    const [records, attempts] = await Promise.all([getAllRecords(), getAllAttempts()]);
    downloadJson(
      { course: "建筑设备", exportedAt: new Date().toISOString(), records, attempts },
      "building-equipment-learning-records.json"
    );
  }

  async function clearBank() {
    if (!window.confirm("确定删除当前题库吗？学习记录不会被清空。")) return;
    await clearQuestionBank();
    setMessage("当前题库已删除。");
    await load();
  }

  async function clearRecords() {
    if (!window.confirm("确定清空全部学习记录、错题、收藏和重点标记吗？")) return;
    await clearLearningRecords();
    setMessage("学习记录已清空。");
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-bold text-equipment-700">Question Bank</div>
        <h1 className="mt-1 text-2xl font-black text-slate-900">题库管理</h1>
      </div>

      <section className="panel p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-lg font-black text-slate-900">
              <FileJson size={20} />
              导入 JSON 题库
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              支持数组格式或包含 questions 字段的 JSON。导入后题库保存在浏览器
              IndexedDB。
            </p>
            <label className="btn-primary mt-4 cursor-pointer">
              <Upload size={17} />
              选择 JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => void handleJsonImport(event.target.files?.[0])}
              />
            </label>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-lg font-black text-slate-900">
              <FileText size={20} />
              直接解析 docx 导入
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              文件名需包含“概念、填空、判断、选择、简答”之一。复杂格式建议先运行脚本生成
              parse-report.json 后人工检查。
            </p>
            <label className="btn-secondary mt-4 cursor-pointer">
              <Upload size={17} />
              选择 docx
              <input
                type="file"
                multiple
                accept=".docx"
                className="hidden"
                onChange={(event) => void handleDocxImport(event.target.files)}
              />
            </label>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={replaceImport}
            onChange={(event) => setReplaceImport(event.target.checked)}
          />
          导入前替换当前题库
        </label>

        {message ? (
          <div className="mt-4 rounded-2xl border border-equipment-200 bg-equipment-50 p-3 text-sm font-semibold text-equipment-800">
            {message}
          </div>
        ) : null}
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">当前题库</h2>
            <p className="mt-1 text-sm text-slate-500">
              共 {questions.length} 道，当前筛选 {filtered.length} 道。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() =>
                downloadJson(questions, "building-equipment-question-bank-export.json")
              }
            >
              <Download size={17} />
              导出题库 JSON
            </button>
            <button className="btn-secondary" onClick={() => void exportRecords()}>
              <Download size={17} />
              导出学习记录
            </button>
            <button className="btn-secondary" onClick={() => void clearRecords()}>
              <Trash2 size={17} />
              清空学习记录
            </button>
            <button className="btn-danger" onClick={() => void clearBank()}>
              <Trash2 size={17} />
              删除题库
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_.8fr_.8fr]">
          <label className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input pl-9"
              placeholder="搜索题干、答案、标签、来源文件..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <select
            className="input"
            value={type}
            onChange={(event) => setType(event.target.value as QuestionType | "all")}
          >
            <option value="all">全部题型</option>
            {QUESTION_TYPE_TAGS.map((item) => (
              <option key={item} value={item}>
                {getQuestionTypeLabel(item)}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={module}
            onChange={(event) => setModule(event.target.value)}
          >
            <option value="all">全部知识模块</option>
            {modules.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="px-4 py-3">题型</th>
                  <th className="px-4 py-3">题目</th>
                  <th className="px-4 py-3">答案</th>
                  <th className="px-4 py-3">模块</th>
                  <th className="px-4 py-3">来源</th>
                  <th className="px-4 py-3">检查</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.slice(0, 300).map((question) => (
                  <tr key={question.id} className="align-top">
                    <td className="px-4 py-3 font-bold text-equipment-700">
                      {getQuestionTypeLabel(question.type)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {question.question}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="line-clamp-3 whitespace-pre-wrap">
                        {formatAnswer(question.answer)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{question.module || "未分组"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {question.sourceFile || "未知"}
                    </td>
                    <td className="px-4 py-3">
                      {question.parseWarning ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                          需检查
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                          正常
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {filtered.length > 300 ? (
          <p className="mt-3 text-xs text-slate-500">
            当前只预览前 300 道，导出时会包含完整题库。
          </p>
        ) : null}
      </section>
    </div>
  );
}
