import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseXlsxBuffer(buffer: Buffer) {
  const XLSX = require("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
  if (rows.length < 2) return { questions: [], errors: ["No data rows found"] };
  const headers = (rows[0] as string[]).map((h) => normalizeKey(String(h)));
  const idx = {
    q: headers.findIndex((h) => h.includes("question")),
    a: headers.findIndex((h) => h === "optiona" || h === "a" || h === "option1"),
    b: headers.findIndex((h) => h === "optionb" || h === "b" || h === "option2"),
    c: headers.findIndex((h) => h === "optionc" || h === "c" || h === "option3"),
    d: headers.findIndex((h) => h === "optiond" || h === "d" || h === "option4"),
    ans: headers.findIndex((h) => h.includes("correct") || h === "answer"),
    expl: headers.findIndex((h) => h.includes("explanation") || h.includes("solution")),
    marks: headers.findIndex((h) => h === "marks" || h.includes("positive")),
    neg: headers.findIndex((h) => h.includes("negative") || h.includes("negativemarks")),
    subject: headers.findIndex((h) => h === "subject"),
    topic: headers.findIndex((h) => h === "topic" || h === "chapter"),
    difficulty: headers.findIndex((h) => h === "difficulty"),
  };
  const questions: any[] = [];
  const errors: string[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => String(c).trim() === "")) continue;
    const qText = idx.q >= 0 ? String(row[idx.q] || "").trim() : String(row[0] || "").trim();
    const optA = idx.a >= 0 ? String(row[idx.a] || "").trim() : String(row[1] || "").trim();
    const optB = idx.b >= 0 ? String(row[idx.b] || "").trim() : String(row[2] || "").trim();
    const optC = idx.c >= 0 ? String(row[idx.c] || "").trim() : String(row[3] || "").trim();
    const optD = idx.d >= 0 ? String(row[idx.d] || "").trim() : String(row[4] || "").trim();
    let ans = idx.ans >= 0 ? String(row[idx.ans] || "").trim() : String(row[5] || "").trim();
    // normalize answer to 0-3
    if (/^[A-Da-d]$/.test(ans)) ans = String("ABCD".indexOf(ans.toUpperCase()));
    else if (/^[1-4]$/.test(ans)) ans = String(Number(ans) - 1);
    else if (ans.toLowerCase().includes("option a")) ans = "0";
    else if (ans.toLowerCase().includes("option b")) ans = "1";
    else if (ans.toLowerCase().includes("option c")) ans = "2";
    else if (ans.toLowerCase().includes("option d")) ans = "3";
    if (!qText) { errors.push(`Row ${r + 1}: missing question text`); continue; }
    if (!optA || !optB || !optC || !optD) { errors.push(`Row ${r + 1}: missing options`); continue; }
    if (!["0", "1", "2", "3"].includes(ans)) { errors.push(`Row ${r + 1}: missing/invalid correct answer`); continue; }
    questions.push({
      questionText: qText,
      options: [optA, optB, optC, optD],
      correctAnswer: ans,
      explanation: idx.expl >= 0 ? String(row[idx.expl] || "").trim() || null : null,
      marks: idx.marks >= 0 ? Number(row[idx.marks]) || 4 : 4,
      negativeMarks: idx.neg >= 0 ? Number(row[idx.neg]) || 0 : 1,
      subject: idx.subject >= 0 ? String(row[idx.subject] || "").trim() || "General" : "General",
      topic: idx.topic >= 0 ? String(row[idx.topic] || "").trim() || null : null,
      difficulty: idx.difficulty >= 0 ? String(row[idx.difficulty] || "").trim().toUpperCase() || "MEDIUM" : "MEDIUM",
    });
  }
  return { questions, errors };
}

function parseTextQuestions(raw: string) {
  // Regex parsing for numbered questions with A-D options and Answer:
  const questions: any[] = [];
  const errors: string[] = [];
  // Split by question numbers
  const blocks = raw.split(/(?=^\s*\d+[\.\)]\s+)/m).filter(b=>b.trim().length>20);
  // fallback if no numbered split, split by Q:
  const effectiveBlocks = blocks.length >= 1 ? blocks : raw.split(/(?=Q\s*\d+)/i);
  for (let i = 0; i < effectiveBlocks.length; i++) {
    const block = effectiveBlocks[i];
    if (!block.trim()) continue;
    // extract question text (up to A.)
    const qMatch = block.match(/^\s*\d+[\.\)]\s*([\s\S]*?)(?=\n\s*A[\.\)])/m) || block.match(/([\s\S]*?)(?=\n\s*A[\.\)])/);
    const qText = qMatch ? qMatch[1].trim().replace(/\n/g, " ") : block.slice(0, 200).trim();
    const optA = (block.match(/\n\s*A[\.\)]\s*([^\n]+)/i) || [])[1]?.trim();
    const optB = (block.match(/\n\s*B[\.\)]\s*([^\n]+)/i) || [])[1]?.trim();
    const optC = (block.match(/\n\s*C[\.\)]\s*([^\n]+)/i) || [])[1]?.trim();
    const optD = (block.match(/\n\s*D[\.\)]\s*([^\n]+)/i) || [])[1]?.trim();
    let ansRaw = (block.match(/Answer\s*[:\-]\s*([A-Da-d1-4])/i) || block.match(/Correct\s*[:\-]\s*([A-Da-d1-4])/i) || [])[1]?.trim();
    if (ansRaw) {
      if (/^[A-Da-d]$/.test(ansRaw)) ansRaw = String("ABCD".indexOf(ansRaw.toUpperCase()));
      else if (/^[1-4]$/.test(ansRaw)) ansRaw = String(Number(ansRaw) - 1);
    }
    const expl = (block.match(/Explanation\s*[:\-]\s*([^\n]+)/i) || [])[1]?.trim() || null;
    if (!qText || !optA || !optB || !optC || !optD) {
      errors.push(`Block ${i + 1}: could not parse options`);
      continue;
    }
    if (!ansRaw || !["0","1","2","3"].includes(ansRaw)) {
      errors.push(`Block ${i + 1}: missing correct answer`);
      continue;
    }
    questions.push({ questionText: qText, options: [optA, optB, optC, optD], correctAnswer: ansRaw, explanation: expl, marks: 4, negativeMarks: 1, subject: "General", topic: null, difficulty: "MEDIUM" });
  }
  return { questions, errors };
}

export async function POST(req: Request) {
  const ctx = await requirePermission("questions:write");
  if ("error" in ctx) return ctx.error;

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File is required" }, { status: 400 });
  const subjectParam = String(formData.get("subject") || "General");
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = (file.name || "").toLowerCase();

  let questions: any[] = [];
  let parseErrors: string[] = [];

  try {
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
      const res = parseXlsxBuffer(buffer);
      questions = res.questions;
      parseErrors = res.errors;
    } else if (fileName.endsWith(".docx")) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || "";
      const res = parseTextQuestions(text);
      questions = res.questions.map((q: any) => ({ ...q, subject: subjectParam }));
      parseErrors = res.errors;
    } else if (fileName.endsWith(".pdf")) {
      try {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        const text = data.text || "";
        const res = parseTextQuestions(text);
        questions = res.questions.map((q: any) => ({ ...q, subject: subjectParam }));
        parseErrors = res.errors;
      } catch (e) {
        return NextResponse.json({ error: "Failed to parse PDF" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .xlsx, .csv, .docx, .pdf" }, { status: 400 });
    }
  } catch (e) {
    console.error("Import parse error", e);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }

  // If ?preview=true return without saving
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "true";
  if (preview) {
    return NextResponse.json({ questions, parseErrors, total: questions.length });
  }

  // Save: body may have questions array override (after preview editing)
  let toSave = questions;
  // If formData contains questions json (edited), use that
  const edited = formData.get("questions");
  if (edited) {
    try { toSave = JSON.parse(String(edited)); } catch {}
  }

  let imported = 0;
  const saveErrors: string[] = [...parseErrors];
  for (let i = 0; i < toSave.length; i++) {
    const q: any = toSave[i];
    try {
      if (!q.questionText || !q.options || !q.correctAnswer) {
        saveErrors.push(`Row ${i + 1}: missing required fields`);
        continue;
      }
      await prisma.question.create({
        data: {
          instituteId: ctx.instituteId,
          subject: String(q.subject || subjectParam).trim() || "General",
          topic: q.topic ? String(q.topic).trim() : null,
          difficulty: q.difficulty ? String(q.difficulty).toUpperCase() : "MEDIUM",
          type: "MCQ_SINGLE",
          questionText: String(q.questionText).trim(),
          options: q.options,
          correctAnswer: String(q.correctAnswer).trim(),
          explanation: q.explanation ? String(q.explanation).trim() : null,
          marks: Number(q.marks) || 4,
          negativeMarks: Number(q.negativeMarks) || 0,
        },
      });
      imported++;
    } catch (err: any) {
      saveErrors.push(`Row ${i + 1}: ${err.message || "save failed"}`);
    }
  }

  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "QUESTIONS_BULK_IMPORTED",
    entityType: "Question",
    metadata: { imported, skipped: toSave.length - imported, fileName: file.name },
  });

  return NextResponse.json({ imported, total: toSave.length, skipped: toSave.length - imported, errors: saveErrors });
}
