import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/tenant";
import PDFDocument from "pdfkit";

export async function GET(req: Request) {
  const ctx = await requirePermission("payments:write");
  if ("error" in ctx) return ctx.error;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx";
  const status = searchParams.get("status");
  const plan = searchParams.get("plan");
  const courseId = searchParams.get("courseId");
  const batchId = searchParams.get("batchId");
  const q = searchParams.get("q") || "";

  const where: any = { instituteId: ctx.instituteId, branchId: ctx.branchId as string };
  if (courseId) where.courseId = courseId;
  if (batchId) where.batchId = batchId;

  const students = await prisma.student.findMany({
    where,
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  // Apply filters like FeesView: name search, status, plan
  const filtered = students.filter((s) => {
    const total = Number(s.totalFee);
    const paid = Number(s.paidFee);
    const pending = Math.max(0, total - paid);
    let feeStatus = "PENDING";
    if (pending === 0 && total > 0) feeStatus = "PAID";
    else if (paid > 0 && pending > 0) feeStatus = s.dueDate && new Date(s.dueDate) < new Date() ? "OVERDUE" : "PARTIAL";
    else if (s.dueDate && new Date(s.dueDate) < new Date() && pending > 0) feeStatus = "OVERDUE";
    if (status && feeStatus !== status) return false;
    if (plan && s.plan !== plan) return false;
    if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.map((s) => ({
    Name: s.name,
    Mobile: s.mobile,
    Course: s.course.name,
    "Total Fee": Number(s.totalFee),
    "Paid Fee": Number(s.paidFee),
    "Pending": Math.max(0, Number(s.totalFee) - Number(s.paidFee)),
    "Due Date": s.dueDate ? s.dueDate.toISOString().slice(0, 10) : "",
    Plan: s.plan,
  }));

  if (format === "pdf") {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

    // Header
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#1E3A5F").text("Fee & Collection Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica").fillColor("#64748B").text(`Generated: ${new Date().toLocaleString("en-IN")} • ${filtered.length} records`, { align: "center" });
    doc.moveDown(1);

    // Table header
    const headers = ["Name", "Course", "Total", "Paid", "Pending", "Due Date", "Plan"];
    const colWidths = [140, 120, 70, 70, 70, 80, 80];
    let x = 30;
    const headerY = doc.y;
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#1E3A5F");
    headers.forEach((h, i) => {
      doc.text(h, x, headerY, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });
    doc.moveTo(30, headerY + 12).lineTo(812, headerY + 12).strokeColor("#D6E0EB").stroke();
    doc.moveDown(1.2);
    doc.font("Helvetica").fillColor("#334155");
    filtered.slice(0, 500).forEach((s) => {
      if (doc.y > 540) { doc.addPage({ layout: "landscape" }); }
      const total = Number(s.totalFee).toString();
      const paid = Number(s.paidFee).toString();
      const pending = Math.max(0, Number(s.totalFee) - Number(s.paidFee)).toString();
      const vals = [s.name.slice(0, 20), s.course.name.slice(0, 18), total, paid, pending, s.dueDate ? s.dueDate.toISOString().slice(0, 10) : "-", s.plan];
      let cx = 30;
      const y = doc.y;
      vals.forEach((v, i) => {
        doc.fontSize(7).text(v, cx, y, { width: colWidths[i], align: "left" });
        cx += colWidths[i];
      });
      doc.moveDown(0.8);
    });

    doc.end();
    const pdfBuffer = await done;
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="fees-export-${Date.now()}.pdf"`,
      },
    });
  } else {
    const XLSX = require("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fees");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="fees-export-${Date.now()}.xlsx"`,
      },
    });
  }
}
