import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseXlsxBuffer(buffer: Buffer) {
  console.log("[import:xlsx] buffer length", buffer.length);
  const XLSX = require("xlsx");
  let wb: any;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch (e: any) {
    console.error("[import:xlsx] XLSX.read failed", e?.message, e?.stack);
    throw new Error(`XLSX read failed: ${e?.message || String(e)}`);
  }
  console.log("[import:xlsx] sheetNames", wb.SheetNames);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in workbook");
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
  console.log("[import:xlsx] rows", rows.length, "header", rows[0]);
  if (rows.length < 2) return { questions: [], errors: ["No data rows found — only header row present"] };
  const headers = (rows[0] as string[]).map((h) => normalizeKey(String(h)));
  console.log("[import:xlsx] normalized headers", headers);
  const idx = {
    q: headers.findIndex((h) => h.includes("question")),
    a: headers.findIndex((h) => h === "optiona" || h === "a" || h === "option1" || h.includes("optiona")),
    b: headers.findIndex((h) => h === "optionb" || h === "b" || h === "option2" || h.includes("optionb")),
    c: headers.findIndex((h) => h === "optionc" || h === "c" || h === "option3" || h.includes("optionc")),
    d: headers.findIndex((h) => h === "optiond" || h === "d" || h === "option4" || h.includes("optiond")),
    ans: headers.findIndex((h) => h.includes("correct") || h === "answer" || h.includes("answerkey")),
    expl: headers.findIndex((h) => h.includes("explanation") || h.includes("solution")),
    marks: headers.findIndex((h) => h === "marks" || h.includes("positive") || h.includes("mark")),
    neg: headers.findIndex((h) => h.includes("negative") || h.includes("negativemarks") || h.includes("neg")),
    subject: headers.findIndex((h) => h === "subject"),
    topic: headers.findIndex((h) => h === "topic" || h === "chapter"),
    difficulty: headers.findIndex((h) => h === "difficulty"),
  };
  console.log("[import:xlsx] idx", idx);
  const questions: any[] = [];
  const errors: string[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as any[];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;
    const qText = idx.q >= 0 ? String(row[idx.q] ?? "").trim() : String(row[0] ?? "").trim();
    const optA = idx.a >= 0 ? String(row[idx.a] ?? "").trim() : String(row[1] ?? "").trim();
    const optB = idx.b >= 0 ? String(row[idx.b] ?? "").trim() : String(row[2] ?? "").trim();
    const optC = idx.c >= 0 ? String(row[idx.c] ?? "").trim() : String(row[3] ?? "").trim();
    const optD = idx.d >= 0 ? String(row[idx.d] ?? "").trim() : String(row[4] ?? "").trim();
    let ans = idx.ans >= 0 ? String(row[idx.ans] ?? "").trim() : String(row[5] ?? "").trim();
    if (/^[A-Da-d]$/.test(ans)) ans = String("ABCD".indexOf(ans.toUpperCase()));
    else if (/^[1-4]$/.test(ans)) ans = String(Number(ans) - 1);
    else if (ans.toLowerCase().includes("option a")) ans = "0";
    else if (ans.toLowerCase().includes("option b")) ans = "1";
    else if (ans.toLowerCase().includes("option c")) ans = "2";
    else if (ans.toLowerCase().includes("option d")) ans = "3";
    if (!qText) { errors.push(`Row ${r + 1}: missing question text`); continue; }
    if (!optA || !optB || !optC || !optD) { errors.push(`Row ${r + 1}: missing options (need 4)`); continue; }
    if (!["0", "1", "2", "3"].includes(ans)) { errors.push(`Row ${r + 1}: missing/invalid correct answer (expected A-D or 1-4, got "${ans}")`); continue; }
    questions.push({
      questionText: qText,
      options: [optA, optB, optC, optD],
      correctAnswer: ans,
      explanation: idx.expl >= 0 ? String(row[idx.expl] ?? "").trim() || null : null,
      marks: idx.marks >= 0 ? Number(row[idx.marks]) || 4 : 4,
      negativeMarks: idx.neg >= 0 ? Number(row[idx.neg]) || 0 : 1,
      subject: idx.subject >= 0 ? String(row[idx.subject] ?? "").trim() || "General" : "General",
      topic: idx.topic >= 0 ? String(row[idx.topic] ?? "").trim() || null : null,
      difficulty: idx.difficulty >= 0 ? String(row[idx.difficulty] ?? "").trim().toUpperCase() || "MEDIUM" : "MEDIUM",
    });
  }
  console.log("[import:xlsx] parsed", questions.length, "errors", errors.length);
  return { questions, errors };
}

function parseTextQuestions(raw: string) {
  console.log("[import:text] raw length", raw.length, "preview", raw.slice(0, 200));
  const questions: any[] = [];
  const errors: string[] = [];
  // Normalize line endings
  const normalized = raw.replace(/\r\n/g, "\n");
  // Split by question numbers — try multiple patterns
  let blocks = normalized.split(/(?=^\s*\d+[\.\)]\s+)/m).filter(b=>b.trim().length>20);
  console.log("[import:text] blocks split1", blocks.length);
  if (blocks.length <= 1) {
    const alt = normalized.split(/(?=Q\s*\d+[\.\)]?\s*)/i).filter(b=>b.trim().length>20);
    console.log("[import:text] blocks split alt", alt.length);
    if (alt.length > blocks.length) blocks = alt;
  }
  if (blocks.length <= 1) {
    // fallback: split by "Answer" boundaries
    const fallback = normalized.split(/\n\s*\d+[\.\)]/).filter(b=>b.trim().length>30);
    console.log("[import:text] blocks fallback", fallback.length);
    if (fallback.length > 1) blocks = fallback.map((b,i)=> `${i+1}. ${b}`);
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.trim()) continue;
    const qMatch = block.match(/^\s*\d+[\.\)]\s*([\s\S]*?)(?=\n\s*A[\.\)])/m) || block.match(/([\s\S]*?)(?=\n\s*A[\.\)])/);
    const qText = qMatch ? qMatch[1].trim().replace(/\s+/g, " ") : block.slice(0, 300).trim().replace(/\n/g," ");
    const optA = (block.match(/\n\s*A[\.\)\\:]?\s*([^\n]+)/i) || [])[1]?.trim();
    const optB = (block.match(/\n\s*B[\.\)\\:]?\s*([^\n]+)/i) || [])[1]?.trim();
    const optC = (block.match(/\n\s*C[\.\)\\:]?\s*([^\n]+)/i) || [])[1]?.trim();
    const optD = (block.match(/\n\s*D[\.\)\\:]?\s*([^\n]+)/i) || [])[1]?.trim();
    let ansRaw = (block.match(/Answer\s*[:\-]\s*([A-Da-d1-4])/i) || block.match(/Correct\s*[:\-]\s*([A-Da-d1-4])/i) || [])[1]?.trim();
    if (ansRaw) {
      if (/^[A-Da-d]$/.test(ansRaw)) ansRaw = String("ABCD".indexOf(ansRaw.toUpperCase()));
      else if (/^[1-4]$/.test(ansRaw)) ansRaw = String(Number(ansRaw) - 1);
    }
    const expl = (block.match(/Explanation\s*[:\-]\s*([^\n]+)/i) || block.match(/Solution\s*[:\-]\s*([^\n]+)/i) || [])[1]?.trim() || null;
    if (!qText || !optA || !optB || !optC || !optD) {
      console.log("[import:text] block", i, "failed q/opt missing", { qText: !!qText, optA: !!optA, optB: !!optB, optC: !!optC, optD: !!optD });
      errors.push(`Block ${i + 1}: could not parse options — check A) B) C) D) formatting`);
      continue;
    }
    if (!ansRaw || !["0","1","2","3"].includes(ansRaw)) {
      errors.push(`Block ${i + 1}: missing correct answer (add "Answer: A/B/C/D")`);
      continue;
    }
    questions.push({ questionText: qText, options: [optA, optB, optC, optD], correctAnswer: ansRaw, explanation: expl, marks: 4, negativeMarks: 1, subject: "General", topic: null, difficulty: "MEDIUM" });
  }
  console.log("[import:text] parsed", questions.length, "errors", errors.length);
  return { questions, errors };
}

export async function POST(req: Request) {
  const ctx = await requirePermission("questions:write");
  if ("error" in ctx) return ctx.error;

  console.log("[import] POST received", req.headers.get("content-type"));
  let formData: FormData | null = null;
  try {
    formData = await req.formData();
    console.log("[import] formData keys", Array.from(formData.keys()));
  } catch (e: any) {
    console.error("[import] formData parse failed", e?.message, e?.stack);
    return NextResponse.json({ error: `Invalid form data: ${e?.message || String(e)}` }, { status: 400 });
  }
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file") as unknown as File | null;
  console.log("[import] file field type", file ? typeof file : "null", "is File?", file instanceof File, "keys", file ? Object.keys(file as any) : "none");
  if (!file || !(file instanceof File)) {
    console.error("[import] missing file field, got", file);
    return NextResponse.json({ error: "File is required (field name must be 'file')" }, { status: 400 });
  }
  console.log("[import] file name", file.name, "type", file.type, "size", file.size);

  const subjectParam = String(formData.get("subject") || "General");
  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    console.log("[import] arrayBuffer length", ab.byteLength);
    buffer = Buffer.from(ab);
    console.log("[import] buffer length", buffer.length);
  } catch (e: any) {
    console.error("[import] buffer conversion failed", e?.message, e?.stack);
    return NextResponse.json({ error: `Failed to read file buffer: ${e?.message || String(e)}` }, { status: 500 });
  }
  if (!buffer || buffer.length === 0) {
    console.error("[import] empty buffer");
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }

  const rawName = (file.name || "").trim();
  const fileName = rawName.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  console.log("[import] fileName", rawName, "mime", mime);

  let questions: any[] = [];
  let parseErrors: string[] = [];
  const ext = fileName.split(".").pop() || "";

  try {
    if (ext === "xlsx" || ext === "xls" || ext === "csv" || mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv") {
      console.log("[import] routing to xlsx parser");
      const res = parseXlsxBuffer(buffer);
      questions = res.questions;
      parseErrors = res.errors;
    } else if (ext === "docx" || mime.includes("officedocument.wordprocessingml") || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      console.log("[import] routing to docx parser");
      let mammoth: any;
      try {
        mammoth = require("mammoth");
        console.log("[import:docx] mammoth loaded");
      } catch (e: any) {
        console.error("[import:docx] mammoth require failed", e?.message);
        return NextResponse.json({ error: `Failed to load docx parser: ${e?.message}` }, { status: 500 });
      }
      let result: any;
      try {
        result = await mammoth.extractRawText({ buffer });
        console.log("[import:docx] extractRawText result keys", Object.keys(result), "value length", result.value?.length, "messages", result.messages?.length);
      } catch (e: any) {
        console.error("[import:docx] extractRawText failed", e?.message, e?.stack);
        return NextResponse.json({ error: `Failed to extract docx text: ${e?.message}` }, { status: 500 });
      }
      const text = result.value || "";
      if (!text.trim()) {
        console.error("[import:docx] no text extracted");
        return NextResponse.json({ error: "No text extracted from docx — file may be scanned image" }, { status: 400 });
      }
      const res = parseTextQuestions(text);
      questions = res.questions.map((q: any) => ({ ...q, subject: subjectParam }));
      parseErrors = res.errors;
    } else if (ext === "pdf" || mime === "application/pdf") {
      console.log("[import] routing to pdf parser");
      let pdfParse: any;
      try {
        // Dynamic import to avoid Next.js build-time pdf-parse debug file read
        // Use lib path directly to bypass test file loading in pdf-parse's index
        try {
          const mod = await import("pdf-parse");
          pdfParse = (mod as any).default || mod;
          console.log("[import:pdf] dynamic import succeeded");
        } catch {
          pdfParse = require("pdf-parse/lib/pdf-parse.js");
          console.log("[import:pdf] require lib succeeded");
        }
      } catch (e: any) {
        console.error("[import:pdf] pdf-parse load failed", e?.message, e?.stack);
        return NextResponse.json({ error: `Failed to load PDF parser: ${e?.message}` }, { status: 500 });
      }
      let data: any;
      try {
        data = await pdfParse(buffer);
        console.log("[import:pdf] pdfParse done, text length", data.text?.length, "numpages", data.numpages);
      } catch (e: any) {
        console.error("[import:pdf] pdfParse execution failed", e?.message, e?.stack);
        return NextResponse.json({ error: `Failed to parse PDF content: ${e?.message}` }, { status: 400 });
      }
      const text = data.text || "";
      if (!text.trim()) {
        console.error("[import:pdf] no text extracted");
        return NextResponse.json({ error: "No text extracted from PDF — may be scanned image" }, { status: 400 });
      }
      const res = parseTextQuestions(text);
      questions = res.questions.map((q: any) => ({ ...q, subject: subjectParam }));
      parseErrors = res.errors;
    } else {
      console.error("[import] unsupported file type", ext, mime);
      return NextResponse.json({ error: `Unsupported file type ".${ext}" (${mime}). Use .xlsx, .csv, .docx, .pdf` }, { status: 400 });
    }
  } catch (e: any) {
    console.error("[import] parse error at top level", e?.message, e?.stack);
    return NextResponse.json({ error: `Failed to parse file: ${e?.message || String(e)}` }, { status: 500 });
  }

  console.log("[import] parse finished questions", questions.length, "parseErrors", parseErrors.length);
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "true";
  if (preview) {
    return NextResponse.json({ questions, parseErrors, total: questions.length });
  }

  let toSave = questions;
  const edited = formData.get("questions");
  if (edited) {
    try { toSave = JSON.parse(String(edited)); console.log("[import] using edited preview", toSave.length); } catch (e: any) { console.error("[import] edited JSON parse failed", e?.message); }
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
      console.error("[import] save row failed", i, err?.message);
      saveErrors.push(`Row ${i + 1}: ${err.message || "save failed"}`);
    }
  }

  console.log("[import] imported", imported, "total", toSave.length);
  await logAudit({
    instituteId: ctx.instituteId,
    actor: actorFromSession(ctx.session),
    action: "QUESTIONS_BULK_IMPORTED",
    entityType: "Question",
    metadata: { imported, skipped: toSave.length - imported, fileName: file.name },
  });

  return NextResponse.json({ imported, total: toSave.length, skipped: toSave.length - imported, errors: saveErrors });
}
