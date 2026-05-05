import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import JSZip from "jszip";

const COURSE = "建筑设备";
const rawFiles = [
  { file: "1概念题.docx", type: "concept", tag: "概念题", prefix: "concept" },
  { file: "2填空题.docx", type: "blank", tag: "填空题", prefix: "blank" },
  { file: "3判断题.docx", type: "true_false", tag: "判断题", prefix: "tf" },
  { file: "4选择题.docx", type: "single_choice", tag: "选择题", prefix: "choice" },
  { file: "5简答题.docx", type: "short_answer", tag: "简答题", prefix: "short" }
];

const outputBankPath = path.resolve("src/data/building-equipment-question-bank.json");
const outputReportPath = path.resolve("src/data/parse-report.json");

async function main() {
  const allQuestions = [];
  const byFile = {};

  for (const meta of rawFiles) {
    const docxPath = await resolveDocxPath(meta.file);
    if (!docxPath) {
      byFile[meta.file] = 0;
      continue;
    }

    const content = await readDocxContent(docxPath);
    const questions =
      meta.type === "blank"
        ? parseBlanks(content.paragraphs, meta)
        : parseByType(content.lines, meta);
    byFile[meta.file] = questions.length;
    allQuestions.push(...questions);
  }

  const report = buildReport(allQuestions, byFile);
  await fs.mkdir(path.dirname(outputBankPath), { recursive: true });
  await fs.writeFile(outputBankPath, `${JSON.stringify(allQuestions, null, 2)}\n`, "utf8");
  await fs.writeFile(outputReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Parsed ${allQuestions.length} questions.`);
  console.log(`Question bank: ${outputBankPath}`);
  console.log(`Parse report: ${outputReportPath}`);
}

async function readDocxContent(docxPath) {
  try {
    const buffer = await fs.readFile(docxPath);
    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (!documentXml) throw new Error("word/document.xml not found");
    const paragraphs = normalizeParagraphs(parseDocumentXml(documentXml));
    return {
      paragraphs,
      lines: paragraphs.map((paragraph) => paragraph.text)
    };
  } catch (error) {
    const result = await mammoth.extractRawText({ path: docxPath });
    const lines = normalizeLines(result.value);
    return {
      paragraphs: lines.map((line) => ({
        text: line,
        runs: [{ text: line, underline: false }]
      })),
      lines
    };
  }
}

function parseDocumentXml(xml) {
  const paragraphs = xml.match(new RegExp("<w:p[\\s\\S]*?</w:p>", "g")) || [];
  return paragraphs.map((paragraphXml) => {
    const runs = (paragraphXml.match(new RegExp("<w:r[\\s\\S]*?</w:r>", "g")) || [])
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

function normalizeParagraphs(paragraphs) {
  return paragraphs
    .map((paragraph) => ({
      ...paragraph,
      text: paragraph.text.trim()
    }))
    .filter((paragraph) => paragraph.text)
    .filter((paragraph) => !/^[-=—]+$/.test(paragraph.text))
    .filter((paragraph) => !isSectionHeading(paragraph.text));
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function isUnderlineRun(runXml) {
  const underlineTag = runXml.match(/<w:u\b[^>]*\/?>/);
  return Boolean(underlineTag && !/w:val=["'](?:none|0|false)["']/.test(underlineTag[0]));
}

async function resolveDocxPath(fileName) {
  const preferred = path.resolve("data/raw", fileName);
  const fallback = path.resolve(fileName);
  if (await exists(preferred)) return preferred;
  if (await exists(fallback)) return fallback;
  console.warn(`Missing ${fileName}. Put it under data/raw/.`);
  return null;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeLines(text) {
  return text
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-=—]+$/.test(line))
    .filter((line) => !isSectionHeading(line));
}

function parseByType(lines, meta) {
  switch (meta.type) {
    case "concept":
      return parseConcepts(lines, meta);
    case "blank":
      return parseBlanks(lines, meta);
    case "true_false":
      return parseTrueFalse(lines, meta);
    case "single_choice":
      return parseChoices(lines, meta);
    case "short_answer":
      return parseShortAnswers(lines, meta);
    default:
      return [];
  }
}

function makeQuestion(meta, index, question, answer, extras = {}) {
  const moduleName = extras.module || inferModule(`${question} ${answer}`);
  return {
    id: `${meta.prefix}-${String(index).padStart(3, "0")}`,
    course: COURSE,
    type: meta.type,
    question,
    answer,
    sourceFile: meta.file,
    tags: [meta.tag, ...(moduleName ? [moduleName] : [])],
    module: moduleName,
    ...extras
  };
}

function stripNumber(line) {
  return line.replace(/^\s*\d{1,4}\s*[.．、)]\s*/, "").trim();
}

function isNumbered(line) {
  return /^\s*\d{1,4}\s*[.．、)]\s*/.test(line);
}

function isSectionHeading(line) {
  const clean = line.replace(/^[一二三四五六七八九十]+[、.．]\s*/, "").trim();
  return (
    clean.length <= 12 &&
    /^(概念题|填空题|判断题|选择题|单项选择题|简答题|名词解释)$/.test(clean)
  );
}

function parseConcepts(lines, meta) {
  return lines.map((line, index) => {
    const clean = stripNumber(line);
    const match = clean.match(/^(.{1,80}?)[：:]\s*(.+)$/);
    if (!match) {
      return makeQuestion(meta, index + 1, `请解释：${clean}`, "", {
        parseWarning: "未识别概念题冒号分隔，需人工补充答案"
      });
    }
    return makeQuestion(
      meta,
      index + 1,
      `请解释：${match[1].trim()}`,
      match[2].trim()
    );
  });
}

function parseBlanks(paragraphs, meta) {
  return paragraphs.map((paragraph, index) => {
    const parsed = parseBlankParagraph(paragraph);
    return makeQuestion(meta, index + 1, parsed.question, parsed.answers, {
      parseWarning: parsed.warning
    });
  });
}

function parseBlankParagraph(paragraph) {
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

function parseUnderlinedBlanks(paragraph) {
  const answers = [];
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

function cleanBlankAnswer(value) {
  return value
    .replace(/[\u3000_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[、，,；;。.\s]+|[、，,；;。.\s]+$/g, "");
}

function parseTrueFalse(lines, meta) {
  return lines.map((line, index) => {
    const clean = stripNumber(line);
    const match = clean.match(/^[（(]\s*([√✓×xX对错])\s*[）)]\s*(.+)$/);
    const symbol = match?.[1];
    const answer = symbol ? /[√✓对]/.test(symbol) : false;
    return makeQuestion(meta, index + 1, match?.[2]?.trim() || clean, answer, {
      parseWarning: match
        ? undefined
        : "未识别判断题答案符号，默认 false，需人工检查"
    });
  });
}

function parseChoices(lines, meta) {
  const blocks = [];
  let current = null;

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

  return blocks.map((block, index) => parseChoiceBlock(block, meta, index + 1));
}

function parseChoiceBlock(block, meta, index) {
  const stem = stripNumber(block.stem);
  const optionsText = block.optionLines.join("\n");
  const combined = `${stem} ${optionsText}`;
  const answerMatch =
    stem.match(/[（(]\s*([A-D])\s*[）)]/) ||
    combined.match(/[（(]\s*([A-D])\s*[）)]\s*$/) ||
    combined.match(/答案\s*[：:]?\s*([A-D])/i);
  const answer = (answerMatch?.[1] || "").toUpperCase();
  const question = stem.replace(/[（(]\s*[A-D]\s*[）)]/g, "（ ）");
  const options = parseChoiceOptions(optionsText.replace(/[（(]\s*[A-D]\s*[）)]\s*$/g, ""));
  const warning = [
    !answer ? "未识别选择题答案" : "",
    options.length < 2 ? "未识别完整选项" : ""
  ]
    .filter(Boolean)
    .join("；");

  return makeQuestion(meta, index, question, answer, {
    options,
    explanation:
      answer && options["ABCD".indexOf(answer)]
        ? `正确答案：${answer}. ${options["ABCD".indexOf(answer)]}`
        : undefined,
    parseWarning: warning || undefined
  });
}

function isChoiceQuestionLine(line) {
  if (isChoiceOptionLine(line)) return false;
  const clean = stripNumber(line);
  return (
    /[（(]\s*[A-D]\s*[）)]/.test(line) ||
    (isNumbered(line) && /[？?]/.test(clean)) ||
    (isNumbered(line) && /[:：]\s*$/.test(clean))
  );
}

function isChoiceOptionLine(line) {
  return /^\s*[A-D]\s*[.．、]/.test(line) || /^\s*[A-D]\s+\S/.test(line);
}

function parseChoiceOptions(optionsText) {
  const text = optionsText.replace(/\s+/g, " ").trim();
  const markerRegex = /(^|\s)([A-D])\s*(?:[.．、]|\s+)\s*/g;
  const matches = Array.from(text.matchAll(markerRegex));
  if (matches.length) {
    return matches
      .map((match, index) => {
        const start = (match.index || 0) + match[0].length;
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

function parseShortAnswers(lines, meta) {
  const blocks = [];
  let current = null;

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
    makeQuestion(meta, index + 1, block.question, block.answerLines.join("\n").trim(), {
      parseWarning: block.answerLines.length
        ? undefined
        : "未识别简答题答案段落，需人工补充答案"
    })
  );
}

function isShortQuestionStart(line) {
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

function stripShortQuestionNumber(line) {
  return line
    .replace(/^\s*\d{1,4}\s*[.．、)]?\s*/, "")
    .trim();
}

function looksLikeShortQuestion(line) {
  const clean = stripNumber(line);
  if (/^[、，,；;。.)）]/.test(clean)) return false;
  return (
    /[？?]\s*$/.test(clean) ||
    /^(简述|说明|试述|论述|写出|列举|何谓|什么是|为什么|如何|怎样)/.test(clean) ||
    /(有哪些|是什么|为什么|哪几种|何种|目的|作用|组成|区别|条件|要求|原则|方法|形式|特点|分类|措施|意义)/.test(clean)
  );
}

function inferModule(text) {
  const rules = [
    [/给水|水表|水泵|管网|水箱|水压/, "建筑给水"],
    [/排水|污水|废水|雨水|通气管|水封/, "建筑排水"],
    [/供暖|采暖|散热器|热水|膨胀水箱|锅炉/, "供暖系统"],
    [/通风|空调|风管|热压|风压|送风|排风/, "通风与空调"],
    [/照明|配电|电气|电压|防雷|接地/, "建筑电气"],
    [/消防|喷淋|消火栓|灭火/, "消防设备"]
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1];
}

function buildReport(questions, byFile) {
  const byType = {};
  for (const question of questions) {
    byType[question.type] = (byType[question.type] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalQuestions: questions.length,
    byFile,
    byType,
    warnings: questions
      .filter((question) => question.parseWarning)
      .map(toReportItem),
    missingAnswers: questions
      .filter((question) => {
        if (Array.isArray(question.answer)) return question.answer.length === 0;
        return question.answer === "" || question.answer === null || question.answer === undefined;
      })
      .map(toReportItem),
    choiceMissingOptions: questions
      .filter(
        (question) =>
          question.type === "single_choice" &&
          (!Array.isArray(question.options) || question.options.length < 2)
      )
      .map(toReportItem)
  };
}

function toReportItem(question) {
  return {
    id: question.id,
    type: question.type,
    sourceFile: question.sourceFile,
    question: question.question,
    parseWarning: question.parseWarning
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
