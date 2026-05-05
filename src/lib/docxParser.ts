import type { Question, QuestionType } from "../types/question";
import { inferModule } from "./questionUtils";

interface DocxRun {
  text: string;
  underline: boolean;
}

interface DocxParagraph {
  text: string;
  runs: DocxRun[];
}

export async function parseDocxFile(file: File): Promise<Question[]> {
  const arrayBuffer = await file.arrayBuffer();
  const paragraphs = await readDocxParagraphs(arrayBuffer);
  return parseParagraphsToQuestions(paragraphs, file.name);
}

export function parseRawTextToQuestions(text: string, sourceFile: string): Question[] {
  const paragraphs = text
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isSectionHeading(line))
    .map((line) => ({ text: line, runs: [{ text: line, underline: false }] }));
  return parseParagraphsToQuestions(paragraphs, sourceFile);
}

function parseParagraphsToQuestions(
  paragraphs: DocxParagraph[],
  sourceFile: string
): Question[] {
  const type = detectTypeFromFileName(sourceFile);
  const lines = paragraphs.map((paragraph) => paragraph.text);

  switch (type) {
    case "concept":
      return parseConcepts(lines, sourceFile);
    case "blank":
      return parseBlanks(paragraphs, sourceFile);
    case "true_false":
      return parseTrueFalse(lines, sourceFile);
    case "single_choice":
      return parseChoices(lines, sourceFile);
    case "short_answer":
      return parseShortAnswers(lines, sourceFile);
    default:
      return lines.map((line, index) =>
        makeQuestion("concept", index + 1, sourceFile, `请解释：${stripNumber(line)}`, "", [
          "未识别题型",
          "请人工检查"
        ])
      );
  }
}

async function readDocxParagraphs(arrayBuffer: ArrayBuffer): Promise<DocxParagraph[]> {
  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error("docx 中没有找到 word/document.xml。");
  }
  return normalizeParagraphs(parseDocumentXml(documentXml));
}

function parseDocumentXml(xml: string): DocxParagraph[] {
  const paragraphs = xml.match(new RegExp("<w:p[\\s\\S]*?</w:p>", "g")) || [];
  return paragraphs.map((paragraphXml) => {
    const runs = (
      paragraphXml.match(new RegExp("<w:r[\\s\\S]*?</w:r>", "g")) || []
    )
      .map((runXml) => {
        const text = Array.from(
          runXml.matchAll(new RegExp("<w:t(?:\\s[^>]*)?>([\\s\\S]*?)</w:t>", "g"))
        )
          .map((match) => decodeXml(match[1]))
          .join("");
        return {
          text,
          underline: isUnderlineRun(runXml)
        };
      })
      .filter((run) => run.text.length > 0);
    return {
      text: runs.map((run) => run.text).join("").trim(),
      runs
    };
  });
}

function normalizeParagraphs(paragraphs: DocxParagraph[]): DocxParagraph[] {
  return paragraphs
    .map((paragraph) => ({ ...paragraph, text: paragraph.text.trim() }))
    .filter((paragraph) => paragraph.text)
    .filter((paragraph) => !/^[-=—]+$/.test(paragraph.text))
    .filter((paragraph) => !isSectionHeading(paragraph.text));
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function isUnderlineRun(runXml: string): boolean {
  const underlineTag = runXml.match(/<w:u\b[^>]*\/?>/);
  return Boolean(underlineTag && !/w:val=["'](?:none|0|false)["']/.test(underlineTag[0]));
}

function detectTypeFromFileName(fileName: string): QuestionType | null {
  if (/概念/.test(fileName)) return "concept";
  if (/填空/.test(fileName)) return "blank";
  if (/判断/.test(fileName)) return "true_false";
  if (/选择/.test(fileName)) return "single_choice";
  if (/简答/.test(fileName)) return "short_answer";
  return null;
}

function stripNumber(line: string): string {
  return line.replace(/^\s*\d{1,4}\s*[.．、)]\s*/, "").trim();
}

function isNumbered(line: string): boolean {
  return /^\s*\d{1,4}\s*[.．、)]\s*/.test(line);
}

function isSectionHeading(line: string): boolean {
  const clean = line.replace(/^[一二三四五六七八九十]+[、.．]\s*/, "").trim();
  return (
    clean.length <= 12 &&
    /^(概念题|填空题|判断题|选择题|单项选择题|简答题|名词解释)$/.test(clean)
  );
}

function makeQuestion(
  type: QuestionType,
  number: number,
  sourceFile: string,
  question: string,
  answer: Question["answer"],
  tags: string[],
  extras: Partial<Question> = {}
): Question {
  const prefixMap: Record<QuestionType, string> = {
    concept: "concept",
    blank: "blank",
    true_false: "tf",
    single_choice: "choice",
    short_answer: "short"
  };
  const module = extras.module ?? inferModule(`${question} ${answer}`);
  return {
    id: `${prefixMap[type]}-${String(number).padStart(3, "0")}`,
    course: "建筑设备",
    type,
    question,
    answer,
    sourceFile,
    tags,
    module,
    ...extras
  };
}

function parseConcepts(lines: string[], sourceFile: string): Question[] {
  return lines.map((line, index) => {
    const clean = stripNumber(line);
    const match = clean.match(/^(.{1,80}?)[：:]\s*(.+)$/);
    if (!match) {
      return makeQuestion(
        "concept",
        index + 1,
        sourceFile,
        `请解释：${clean}`,
        "",
        ["概念题"],
        { parseWarning: "未识别概念题冒号分隔，需人工补充答案" }
      );
    }
    return makeQuestion(
      "concept",
      index + 1,
      sourceFile,
      `请解释：${match[1].trim()}`,
      match[2].trim(),
      ["概念题"]
    );
  });
}

function parseBlanks(paragraphs: DocxParagraph[], sourceFile: string): Question[] {
  return paragraphs.map((paragraph, index) => {
    const parsed = parseBlankParagraph(paragraph);
    return makeQuestion(
      "blank",
      index + 1,
      sourceFile,
      parsed.question,
      parsed.answers,
      ["填空题", ...(inferModule(parsed.question) ? [inferModule(parsed.question)!] : [])],
      parsed.warning ? { parseWarning: parsed.warning } : {}
    );
  });
}

function parseBlankParagraph(paragraph: DocxParagraph): {
  question: string;
  answers: string[];
  warning?: string;
} {
  const underlined = parseUnderlinedBlanks(paragraph);
  if (underlined.answers.length > 0 || underlined.hasUnderline) {
    return {
      question: stripNumber(underlined.question),
      answers: underlined.answers,
      warning: underlined.answers.length
        ? undefined
        : "检测到 Word 下划线空位，但下划线内容为空，需人工补充答案"
    };
  }

  return {
    question: stripNumber(paragraph.text),
    answers: [],
    warning: "未检测到 Word 下划线答案，保留原句供人工检查"
  };
}

function parseUnderlinedBlanks(paragraph: DocxParagraph): {
  question: string;
  answers: string[];
  hasUnderline: boolean;
} {
  const answers: string[] = [];
  let question = "";
  let pendingAnswer = "";
  let hasUnderline = false;
  let inUnderlineGroup = false;

  function closeUnderlineGroup() {
    if (!inUnderlineGroup) return;
    const clean = cleanBlankAnswer(pendingAnswer);
    if (clean) answers.push(clean);
    pendingAnswer = "";
    inUnderlineGroup = false;
  }

  for (const run of paragraph.runs) {
    if (run.underline) {
      hasUnderline = true;
      pendingAnswer += run.text;
      if (!inUnderlineGroup) {
        question += "____";
        inUnderlineGroup = true;
      }
    } else {
      closeUnderlineGroup();
      question += run.text;
    }
  }
  closeUnderlineGroup();

  return {
    question: question.replace(/_{4,}(?:\s*_{4,})+/g, "____").trim(),
    answers,
    hasUnderline
  };
}

function cleanBlankAnswer(value: string): string {
  return value
    .replace(/[\u3000_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[、，,；;。.\s]+|[、，,；;。.\s]+$/g, "");
}

function parseTrueFalse(lines: string[], sourceFile: string): Question[] {
  return lines.map((line, index) => {
    const clean = stripNumber(line);
    const match = clean.match(/^[（(]\s*([√✓×xX对错])\s*[）)]\s*(.+)$/);
    const answerSymbol = match?.[1];
    const answer = answerSymbol ? /[√✓对]/.test(answerSymbol) : false;
    return makeQuestion(
      "true_false",
      index + 1,
      sourceFile,
      match?.[2]?.trim() || clean,
      answer,
      ["判断题"],
      match ? {} : { parseWarning: "未识别判断题答案符号，默认 false，需人工检查" }
    );
  });
}

function parseChoices(lines: string[], sourceFile: string): Question[] {
  const blocks: Array<{ stem: string; optionLines: string[] }> = [];
  let current: { stem: string; optionLines: string[] } | null = null;
  for (const line of lines) {
    if (isChoiceQuestionLine(line)) {
      if (current) blocks.push(current);
      current = { stem: line, optionLines: [] };
    } else if (current) {
      current.optionLines.push(line);
    } else {
      current = { stem: line, optionLines: [] };
    }
  }
  if (current) blocks.push(current);

  return blocks.map((block, index) => {
    const stem = stripNumber(block.stem);
    const optionsText = block.optionLines.join("\n");
    const combined = `${stem} ${optionsText}`;
    const answerMatch =
      stem.match(/[（(]\s*([A-D])\s*[）)]/) ||
      combined.match(/[（(]\s*([A-D])\s*[）)]\s*$/) ||
      combined.match(/答案\s*[：:]?\s*([A-D])/i);
    const answer = (answerMatch?.[1] ?? "").toUpperCase();
    const question = stem.replace(/[（(]\s*[A-D]\s*[）)]/g, "（ ）");
    const options = parseChoiceOptions(
      optionsText.replace(/[（(]\s*[A-D]\s*[）)]\s*$/g, "")
    );
    const warning = [
      !answer ? "未识别选择题答案" : "",
      options.length < 2 ? "未识别完整选项" : ""
    ]
      .filter(Boolean)
      .join("；");

    return makeQuestion(
      "single_choice",
      index + 1,
      sourceFile,
      question,
      answer,
      ["选择题"],
      {
        options,
        explanation:
          answer && options["ABCD".indexOf(answer)]
            ? `正确答案：${answer}. ${options["ABCD".indexOf(answer)]}`
            : undefined,
        parseWarning: warning || undefined
      }
    );
  });
}

function isChoiceQuestionLine(line: string): boolean {
  if (isChoiceOptionLine(line)) return false;
  const clean = stripNumber(line);
  return (
    /[（(]\s*[A-D]\s*[）)]/.test(line) ||
    (isNumbered(line) && /[？?]/.test(clean)) ||
    (isNumbered(line) && /[:：]\s*$/.test(clean))
  );
}

function isChoiceOptionLine(line: string): boolean {
  return /^\s*[A-D]\s*[.．、]/.test(line) || /^\s*[A-D]\s+\S/.test(line);
}

function parseChoiceOptions(optionsText: string): string[] {
  const text = optionsText.replace(/\s+/g, " ").trim();
  const markerRegex = /(^|\s)([A-D])\s*(?:[.．、]|\s+)\s*/g;
  const matches = Array.from(text.matchAll(markerRegex));
  if (matches.length) {
    return matches
      .map((match, index) => {
        const start = (match.index ?? 0) + match[0].length;
        const end = matches[index + 1]?.index ?? text.length;
        return text.slice(start, end).trim();
      })
      .filter(Boolean);
  }

  return optionsText
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseShortAnswers(lines: string[], sourceFile: string): Question[] {
  const blocks: Array<{ question: string; answerLines: string[] }> = [];
  let current: { question: string; answerLines: string[] } | null = null;

  for (const line of lines) {
    if (isShortQuestionStart(line)) {
      if (current) blocks.push(current);
      current = { question: stripShortQuestionNumber(line), answerLines: [] };
    } else if (current) {
      current.answerLines.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.map((block, index) =>
    makeQuestion(
      "short_answer",
      index + 1,
      sourceFile,
      block.question,
      block.answerLines.join("\n").trim(),
      ["简答题"],
      block.answerLines.length
        ? {}
        : { parseWarning: "未识别简答题答案段落，需人工补充答案" }
    )
  );
}

function isShortQuestionStart(line: string): boolean {
  if (/^\s*\d{1,2}[)）]\s*[、，,]/.test(line)) {
    return false;
  }
  return (
    (isNumbered(line) && looksLikeShortQuestion(line)) ||
    /^\s*\d{1,3}\s*(?=简述|什么|常用|建筑|室内|高层|第一|电线|电力|灯具|集中|民用|热水|蒸汽|防火|自动|等电位)/.test(
      line
    )
  );
}

function stripShortQuestionNumber(line: string): string {
  return line
    .replace(/^\s*\d{1,4}\s*[.．、)]?\s*/, "")
    .trim();
}

function looksLikeShortQuestion(line: string): boolean {
  const clean = stripNumber(line);
  if (/^[、，,；;。.)）]/.test(clean)) return false;
  return (
    /[？?]\s*$/.test(clean) ||
    /^(简述|说明|试述|论述|写出|列举|何谓|什么是|为什么|如何|怎样)/.test(clean) ||
    /(有哪些|是什么|为什么|哪几种|何种|目的|作用|组成|区别|条件|要求|原则|方法|形式|特点|分类|措施|意义)/.test(clean)
  );
}
