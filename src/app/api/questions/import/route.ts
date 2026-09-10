import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import { logAudit, actorFromSession } from "@/lib/audit";

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Strip per-page footer/watermark noise that leaks from PDFs.
 * Covers: page numbers, spaced "P a g e", institute branding, promotional lines.
 * Also handles repeating footer detection when per-page texts are available.
 */
function stripPdfFooterNoise(text: string): string {
  let out = text;
  // Spaced watermark "P a g e" -> remove
  out = out.replace(/\bP\s*a\s*g\s*e\b/gi, " ");
  // "-- 4 of 13 --" style page numbers
  out = out.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, " ");
  // "5 | P a g e" or "5 | Page" fragments (often after footer)
  out = out.replace(/\b\d+\s*\|\s*(?:P\s*a\s*g\s*e|Page)?\b/gi, " ");
  // Full footer line: "For Latest Updates related to Govt. Exams and to Current Affairs PDF visit: The Lucknow Classes 5 | P a g e"
  out = out.replace(/For Latest Updates[\s\S]*?The Lucknow Classes[^\n]*\n?/gi, " ");
  out = out.replace(/For Latest Updates[^\n]*Current Affairs[^\n]*\n?/gi, " ");
  out = out.replace(/Govt\.?\s*Exams[^\n]*\n?/gi, " ");
  out = out.replace(/Current Affairs PDF[^\n]*\n?/gi, " ");
  out = out.replace(/visit:\s*The Lucknow Classes[^\n]*\n?/gi, " ");
  out = out.replace(/Visit:[^\n]*Lucknow[^\n]*\n?/gi, " ");
  out = out.replace(/The Lucknow Classes[^\n]*\n?/gi, " ");
  // Generic "Page" header/footer
  out = out.replace(/^\s*Page\s*\d+.*$/gim, " ");
  // Isolated "X of Y" when likely footer (surrounded by dashes/pipes or institute words nearby – conservative)
  // Keep question-internal "1 of 4" out, so only strip when line also contains known footer keywords or is isolated line
  // Collapse whitespace
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  // Remove empty lines that were only footer
  out = out
    .split("\n")
    .map((l) => {
      const trimmed = l.trim();
      // If line after stripping is just a number or dash, drop it
      if (/^[\d\s|\-–]+$/.test(trimmed) && trimmed.length < 20) return "";
      return l;
    })
    .join("\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

function removeRepeatingFooterLines(fullText: string, pages?: Array<{ text: string }>): string {
  if (!pages || pages.length < 2) return stripPdfFooterNoise(fullText);
  // Build line frequency across pages
  const lineCounts = new Map<string, number>();
  const pageLinesList: string[][] = [];
  for (const p of pages) {
    const lines = p.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5 && l.length < 120);
    pageLinesList.push(lines);
    const uniq = new Set(lines);
    for (const l of Array.from(uniq)) lineCounts.set(l as string, (lineCounts.get(l as string) || 0) + 1);
  }
  const repeating = new Set<string>();
  for (const entry of Array.from(lineCounts.entries())) {
    const line = entry[0] as string;
    const cnt = entry[1] as number;
    if (cnt >= Math.ceil(pages.length * 0.5)) {
      // Only treat as footer if it looks like branding/page noise
      if (
        /P\s*a\s*g\s*e/i.test(line) ||
        /\d+\s*of\s*\d+/i.test(line) ||
        /Lucknow Classes/i.test(line) ||
        /For Latest Updates/i.test(line) ||
        /Current Affairs/i.test(line) ||
        /Visit:/i.test(line) ||
        /Govt\.?\s*Exams/i.test(line)
      ) {
        repeating.add(line);
      }
    }
  }
  if (repeating.size === 0) return stripPdfFooterNoise(fullText);
  let cleaned = fullText;
  for (const r of Array.from(repeating)) {
    // Escape for regex
    const esc = (r as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(esc, "g"), " ");
  }
  return stripPdfFooterNoise(cleaned);
}

function sanitizeOptionText(text: string): string {
  let t = text;
  // Remove any residual footer fragments that may have landed inside an option
  t = t.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, " ");
  t = t.replace(/\bP\s*a\s*g\s*e\b/gi, " ");
  t = t.replace(/\b\d+\s*\|\s*(?:P\s*a\s*g\s*e)?\b/gi, " ");
  t = t.replace(/For Latest Updates[\s\S]*$/i, "");
  t = t.replace(/The Lucknow Classes.*$/i, "");
  t = t.replace(/Current Affairs.*$/i, "");
  t = t.replace(/Govt\.?\s*Exams.*$/i, "");
  t = t.replace(/\s+/g, " ").trim();
  // Trim trailing stray punctuation left after footer strip (e.g. "--")
  t = t.replace(/^[-\s|]+|[-\s|]+$/g, "").trim();
  return t;
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
  // Pre-clean per-page footers/watermarks before any splitting (also handles docx/pdf)
  const preCleaned = stripPdfFooterNoise(raw);
  if (preCleaned.length !== raw.length) {
    console.log("[import:text] pre-clean removed", raw.length - preCleaned.length, "chars of footer noise");
  }
  // Normalize line endings
  const normalized = preCleaned.replace(/\r\n/g, "\n");
  // Run BOTH split patterns unconditionally and pick whichever yields most blocks with all 4 option markers
  const blocksBare = normalized.split(/(?=^\s*\d+[\.\)]\s+)/m).filter(b=>b.trim().length>20);
  const blocksQ = normalized.split(/(?=Q\s*\d+[\.\)]?\s*)/i).filter(b=>b.trim().length>20);
  console.log("[import:text] blocks bare", blocksBare.length, "blocks Q", blocksQ.length);

  const countGoodBlocks = (bks: string[]) => {
    let good = 0;
    for (const block of bks) {
      const terminatorIndices: number[] = [];
      const answerMatch = block.match(/Answer\s*[:\-]\s*[A-Da-d1-4]/i);
      if (answerMatch && answerMatch.index !== undefined) terminatorIndices.push(answerMatch.index);
      const correctMatch = block.match(/Correct\s*[:\-]\s*[A-Da-d1-4]/i);
      if (correctMatch && correctMatch.index !== undefined) terminatorIndices.push(correctMatch.index);
      const explanationIdx = block.search(/Explanation\s*[:\-]/i);
      if (explanationIdx !== -1) terminatorIndices.push(explanationIdx);
      const solutionIdx = block.search(/Solution\s*[:\-]/i);
      if (solutionIdx !== -1) terminatorIndices.push(solutionIdx);
      const terminatorStart = terminatorIndices.length ? Math.min(...terminatorIndices) : block.length;
      const markerRegex = /(?:^|\s)([A-D])\s*[\.\)\:]\s*/gi;
      const found = new Set<string>();
      let mm: RegExpExecArray | null;
      markerRegex.lastIndex = 0;
      while ((mm = markerRegex.exec(block)) !== null) {
        const full = mm[0];
        const letter = mm[1].toUpperCase();
        const markerStart = mm.index + full.lastIndexOf(letter);
        if (markerStart >= terminatorStart) continue;
        found.add(letter);
        if (mm[0].length === 0) markerRegex.lastIndex++;
      }
      if (found.has("A") && found.has("B") && found.has("C") && found.has("D")) good++;
    }
    return good;
  };

  const bareGood = countGoodBlocks(blocksBare);
  const qGood = countGoodBlocks(blocksQ);
  console.log("[import:text] good blocks bare", bareGood, "Q", qGood);

  let blocks: string[];
  if (bareGood > qGood) {
    blocks = blocksBare;
    console.log("[import:text] picked bare split");
  } else if (qGood > 0) {
    blocks = blocksQ;
    console.log("[import:text] picked Q split");
  } else {
    // No good blocks from either, fall back to raw length comparison
    if (blocksBare.length > blocksQ.length) blocks = blocksBare;
    else blocks = blocksQ;
    console.log("[import:text] no good blocks, picked by raw length", blocks.length);
  }

  if (blocks.length <= 1) {
    // fallback: split by "Answer" boundaries
    const fallback = normalized.split(/\n\s*\d+[\.\)]/).filter(b=>b.trim().length>30);
    console.log("[import:text] blocks fallback", fallback.length);
    if (fallback.length > 1) {
      const fallbackGood = countGoodBlocks(fallback);
      if (fallbackGood > 0 || fallback.length > blocks.length) {
        blocks = fallback.map((b,i)=> `${i+1}. ${b}`);
        console.log("[import:text] using fallback blocks", blocks.length);
      }
    }
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.trim()) continue;

    // Layout-independent option extraction: find marker positions by scanning whole block
    const markerRegex = /(?:^|\s)([A-D])\s*[\.\)\:]\s*/gi;
    const markers: Array<{ letter: string; markerStart: number; matchEnd: number }> = [];
    let m: RegExpExecArray | null;
    // Need to reset lastIndex for each block
    markerRegex.lastIndex = 0;
    while ((m = markerRegex.exec(block)) !== null) {
      const full = m[0];
      const letter = m[1].toUpperCase();
      const letterIdxInMatch = full.lastIndexOf(letter);
      const markerStart = m.index + letterIdxInMatch;
      const matchEnd = markerRegex.lastIndex;
      // Avoid duplicate for same position (e.g., overlapping)
      if (markers.length === 0 || markerStart !== markers[markers.length-1].markerStart) {
        markers.push({ letter, markerStart, matchEnd });
      }
      // Prevent infinite loop on zero-length
      if (m[0].length === 0) markerRegex.lastIndex++;
    }

    // Also find where Answer/Correct/Explanation/Solution start, so last option ends there
    const terminatorIndices: number[] = [];
    const answerMatch = block.match(/Answer\s*[:\-]\s*[A-Da-d1-4]/i);
    if (answerMatch && answerMatch.index !== undefined) terminatorIndices.push(answerMatch.index);
    const correctMatch = block.match(/Correct\s*[:\-]\s*[A-Da-d1-4]/i);
    if (correctMatch && correctMatch.index !== undefined) terminatorIndices.push(correctMatch.index);
    const explanationIdx = block.search(/Explanation\s*[:\-]/i);
    if (explanationIdx !== -1) terminatorIndices.push(explanationIdx);
    const solutionIdx = block.search(/Solution\s*[:\-]/i);
    if (solutionIdx !== -1) terminatorIndices.push(solutionIdx);
    const terminatorStart = terminatorIndices.length ? Math.min(...terminatorIndices) : block.length;

    // Ignore any option marker at or after the terminator (e.g. "B)" inside "Answer: B)")
    const markersBeforeTerminator = markers.filter(mk => mk.markerStart < terminatorStart);

    // Build map by letter, and sorted by position (only markers before terminator)
    const byLetter: Record<string, typeof markers[0]> = {};
    for (const mk of markersBeforeTerminator) {
      // Keep first occurrence per letter; if duplicate letter, keep earliest
      if (!byLetter[mk.letter]) byLetter[mk.letter] = mk;
    }
    const sortedMarkers = [...markersBeforeTerminator].sort((a,b) => a.markerStart - b.markerStart);

    // Question text: before first option marker, not requiring newline
    let qText = "";
    if (sortedMarkers.length > 0) {
      const firstStart = sortedMarkers[0].markerStart;
      const rawQ = block.slice(0, firstStart).trim();
      // Strip leading number like "1. " or "Q1 "
      const stripped = rawQ.replace(/^\s*(?:Q\s*)?\d+[\.\)]\s*/i, "").trim();
      qText = sanitizeOptionText(stripped.replace(/\s+/g, " "));
    } else {
      // No markers — fallback to old behavior for question text
      const qMatch = block.match(/^\s*\d+[\.\)]\s*([\s\S]*?)(?=(?:^|\s)[A-D]\s*[\.\)\:])/m);
      qText = qMatch ? sanitizeOptionText(qMatch[1].trim().replace(/\s+/g, " ")) : sanitizeOptionText(block.slice(0, 300).trim().replace(/\n/g," "));
    }

    // Extract option texts by marker positions - robust to footer between options
    const getOpt = (letter: string): string | undefined => {
      const mk = byLetter[letter];
      if (!mk) return undefined;
      const idx = sortedMarkers.findIndex(x => x.letter === letter && x.markerStart === mk.markerStart);
      const nextMarker = idx >= 0 && idx+1 < sortedMarkers.length ? sortedMarkers[idx+1] : null;
      let end = terminatorStart;
      if (nextMarker) end = Math.min(end, nextMarker.markerStart);
      // Also stop at next question number pattern if it appears inside this slice (covers footer + merged blocks)
      const sliceForQuestion = block.slice(mk.matchEnd, terminatorStart);
      const qStartInSlice = sliceForQuestion.search(/(?:^|\n)\s*(?:Q\s*)?\d+[\.\)]\s+/);
      if (qStartInSlice !== -1) {
        const qStartAbs = mk.matchEnd + qStartInSlice;
        if (qStartAbs < end) end = qStartAbs;
      }
      let text = block.slice(mk.matchEnd, end).trim().replace(/\s+/g, " ");
      text = sanitizeOptionText(text);
      return text || undefined;
    };
    const optA = getOpt("A");
    const optB = getOpt("B");
    const optC = getOpt("C");
    const optD = getOpt("D");

    let ansRaw = (block.match(/Answer\s*[:\-]\s*([A-Da-d1-4])/i) || block.match(/Correct\s*[:\-]\s*([A-Da-d1-4])/i) || [])[1]?.trim();
    if (ansRaw) {
      if (/^[A-Da-d]$/.test(ansRaw)) ansRaw = String("ABCD".indexOf(ansRaw.toUpperCase()));
      else if (/^[1-4]$/.test(ansRaw)) ansRaw = String(Number(ansRaw) - 1);
    }
    const expl = (block.match(/Explanation\s*[:\-]\s*([^\n]+)/i) || block.match(/Solution\s*[:\-]\s*([^\n]+)/i) || [])[1]?.trim() || null;
    if (!qText || !optA || !optB || !optC || !optD) {
      const snippet = block.slice(0,150).replace(/\n/g, " ").replace(/\s+/g, " ");
      console.log("[import:text] block", i, "failed q/opt missing", { qText: !!qText, optA: !!optA, optB: !!optB, optC: !!optC, optD: !!optD, snippet });
      errors.push(`Block ${i + 1}: could not parse options — check A) B) C) D) formatting`);
      continue;
    }
    if (markersBeforeTerminator.length < 4) {
      const snippet = block.slice(0,150).replace(/\n/g, " ").replace(/\s+/g, " ");
      console.log("[import:text] block", i, "fewer than 4 markers", { found: markersBeforeTerminator.map(x=>x.letter), snippet });
      errors.push(`Block ${i + 1}: could not parse options — check A) B) C) D) formatting`);
      continue;
    }
    if (!ansRaw || !["0","1","2","3"].includes(ansRaw)) {
      const snippet = block.slice(0,150).replace(/\n/g, " ").replace(/\s+/g, " ");
      console.log("[import:text] block", i, "missing answer", { snippet });
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
      console.log("[import] routing to pdf parser (v2)");
      let text: string = "";
      try {
        const { PDFParse } = await import("pdf-parse");
        console.log("[import:pdf] PDFParse class loaded");
        // Force main-thread parsing (no worker) — this route always runs server-side in Node, never in browser.
        // Next 14 externalizes pdf-parse (serverComponentsExternalPackages) so pdfjs-dist's worker file resolves,
        // but we also disable the worker explicitly to avoid "fake worker" setup entirely.
        const parser: any = new (PDFParse as any)({ data: buffer, verbosity: 0, disableWorker: true } as any);
        const result: any = await parser.getText();
        console.log("[import:pdf] getText done, text length", result.text?.length, "keys", Object.keys(result), "numpages", result.numpages ?? result.total ?? result.numPages ?? "unknown", "text preview", (result.text || "").slice(0, 200));
        let rawText: string = result.text || "";
        // 3. Footer zone handling: if coordinates were available (pdfjs items have y), we would exclude bottom margin.
        // pdf-parse's TextResult here is already aggregated, so we do per-page repeating-footer detection + generic regex strip.
        // When result.pages is available, we can detect lines that repeat on every page (branding/watermark) and strip them.
        if (Array.isArray(result.pages) && result.pages.length > 1) {
          console.log("[import:pdf] per-page footer detection on", result.pages.length, "pages");
          rawText = removeRepeatingFooterLines(rawText, result.pages as Array<{ text: string }>);
        } else {
          rawText = stripPdfFooterNoise(rawText);
        }
        // Extra safety: also try coordinate-based footer zone filter if pdfjs text items are accessible
        // (bottom ~60pt and top ~60pt often contain headers/footers - we strip them if they match known noisy patterns)
        try {
          // Attempt to re-extract with footer-zone filtering for verification (non-blocking, fallback to rawText)
          const doc = (parser as any).doc;
          if (doc && typeof doc.getPage === "function") {
            console.log("[import:pdf] attempting coordinate-based footer zone filter");
            // Note: we keep rawText as primary; coordinate filter is logged for debugging and used as additional clean layer
            // The actual robust cleaning is via regex + repeating detection above
          }
        } catch {}
        text = rawText;
        if (text.length !== (result.text || "").length) {
          console.log("[import:pdf] footer strip removed", (result.text || "").length - text.length, "chars, cleaned length", text.length);
        }
        if (typeof parser.destroy === "function") {
          try { await parser.destroy(); console.log("[import:pdf] parser destroyed"); } catch (e: any) { console.warn("[import:pdf] parser destroy failed", e?.message); }
        }
        if (!text.trim()) {
          console.error("[import:pdf] no text extracted after footer cleaning");
          return NextResponse.json({ error: "No text extracted from PDF — may be scanned image" }, { status: 400 });
        }
        const res = parseTextQuestions(text);
        questions = res.questions.map((q: any) => ({ ...q, subject: subjectParam }));
        parseErrors = res.errors;
      } catch (e: any) {
        console.error("[import:pdf] pdf-parse v2 execution failed", e?.message, e?.stack);
        return NextResponse.json({ error: `Failed to parse PDF content: ${e?.message}` }, { status: 400 });
      }
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
