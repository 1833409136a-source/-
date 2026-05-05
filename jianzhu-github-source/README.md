# building-equipment-quiz

建筑设备刷题系统是一个本地运行的《建筑设备》课程复习工具，用于概念题、填空题、判断题、单项选择题和简答题练习。项目不需要后端、不需要登录、不需要数据库服务器，题库和学习记录保存在浏览器 IndexedDB。

## 功能列表

- 首页 Dashboard：总题数、各题型数量、已练习题数、正确率、错题数、收藏数、今日练习数、最近练习时间。
- 题库管理：导入 JSON、直接解析 docx 导入、筛选、搜索、导出题库、导出学习记录、删除题库、清空学习记录。
- 刷题练习：随机练习、按题型练习、错题练习、收藏题练习、重点题练习、未做题练习。
- 五种题型交互：概念题、填空题、判断题、单项选择题、简答题。
- 错题本：记录错误次数、最近错误时间、最近答案、标准答案，支持重新练习和移出错题本。
- 学习统计：总练习次数、总正确率、各题型正确率、错题 Top 10、最近 7 天练习量、薄弱题型。
- 本地数据：使用 Dexie.js + IndexedDB 保存题库和学习记录。

## 安装方式

在项目根目录运行：

```bash
npm install
```

如果你在 Windows PowerShell 中遇到 `npm.ps1` 执行策略问题，可以改用：

```bash
npm.cmd install
```

## 启动方式

```bash
npm run dev
```

启动后浏览器打开终端提示的地址，通常是：

```text
http://localhost:5173
```

## 如何放置 docx 原始题库

把老师提供的 5 个 Word 文件放到：

```text
data/raw/
```

文件名建议保持为：

```text
data/raw/1概念题.docx
data/raw/2填空题.docx
data/raw/3判断题.docx
data/raw/4选择题.docx
data/raw/5简答题.docx
```

当前项目已把根目录中已有的 5 个 docx 复制到了 `data/raw/`。

## 如何运行 docx 解析脚本

先安装依赖，然后运行：

```bash
npm run parse:docx
```

解析完成后会生成：

```text
src/data/building-equipment-question-bank.json
src/data/parse-report.json
```

其中：

- `building-equipment-question-bank.json` 是系统可直接加载的统一题库。
- `parse-report.json` 会记录解析总数、每个文件解析数量、每种题型数量、带 `parseWarning` 的题、缺答案的题、缺选项的选择题。

## 统一 JSON 题库格式

```ts
export type QuestionType =
  | "concept"
  | "blank"
  | "true_false"
  | "single_choice"
  | "short_answer";

export interface Question {
  id: string;
  course: "建筑设备";
  chapter?: string;
  module?: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string | string[] | boolean;
  explanation?: string;
  sourceFile?: string;
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard";
  parseWarning?: string;
}
```

`parseWarning` 是为了 Word 资料格式不统一时人工检查使用，正式题库中可以保留，也可以人工修正后删除。

## 如何导入题库

有两种方式：

1. 运行 `npm run parse:docx` 后，项目会在首次打开时优先加载 `src/data/building-equipment-question-bank.json`。
2. 打开网页中的“题库管理”，选择 JSON 文件导入，或直接选择 docx 文件解析导入。

题库管理中可以勾选“导入前替换当前题库”。不勾选时会追加或覆盖同 ID 题目。

## 如何刷题

首页点击：

- 开始随机练习
- 按题型练习
- 错题回顾
- 未做题

练习页一次显示一道题，支持提交答案、查看标准答案、下一题、跳过、收藏、标记重点和重新开始本轮练习。

## 如何查看错题本

进入“错题本”页面。答错一次会自动进入错题本；简答题选择“半对 / 需要复习”也会进入错题本。错题本支持重新练习和手动移出。

## 如何导出学习记录

进入“题库管理”页面，点击“导出学习记录”。导出的 JSON 包含：

- `records`：每道题的练习次数、正确次数、错误次数、收藏、重点、错题状态。
- `attempts`：每次提交记录，用于统计最近 7 天练习量和正确率。

## 当前 MVP 的限制

- 概念题只做简单关键短语匹配，不做复杂 NLP 自动判分。
- 简答题不自动判分，需要用户对照参考答案手动选择“我答对了 / 我答错了 / 半对”。
- Word 题库不是标准数据库，解析脚本已经尽量兼容中文冒号、英文冒号、不同题号、判断符号、同行或多行选项、简答多段答案，但仍可能有少量题需要人工修正。
- 填空题答案如果没有明显空格、下划线或括号标记，可能无法自动识别，会在 `parse-report.json` 中标记。
- 选择题如果答案没有写在题干括号或“答案：A”附近，可能需要人工补充。

## 后续可扩展功能

- 连续答对 2 次自动移出错题本。
- 章节化复习计划和考试倒计时。
- 导入题库时的可视化人工修正界面。
- 更多题型，如多选题、配伍题。
- 离线 PWA 安装到桌面或手机。
