import { NextResponse } from "next/server";
import { requireInstitute } from "@/lib/tenant";
import { getReportsData } from "@/lib/reports-data";
import PDFDocument from "pdfkit";

export async function GET(req: Request) {
  const ctx = await requireInstitute();
  if ("error" in ctx) return ctx.error;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "xlsx";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const courseId = searchParams.get("courseId") || undefined;
  const batchId = searchParams.get("batchId") || undefined;

  const data = await getReportsData(ctx.instituteId, ctx.branchId as string, { startDate, endDate, courseId, batchId });

  if (format === "pdf") {
    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#1E3A5F").text("Reports & Analytics Export", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(8).font("Helvetica").fillColor("#64748B").text(`Generated: ${new Date().toLocaleString("en-IN")} • Filters: ${courseId || "All Courses"} / ${batchId || "All Batches"}`, { align: "center" });
    doc.moveDown(1);
    const kpis = [
      `Students: ${data.studentsReport.kpis.total} (Active ${data.studentsReport.kpis.active})`,
      `Batches: ${data.batchReport.kpis.totalBatches} • Admissions: ${data.admissionReport.kpis.totalApplications}`,
      `Fee Collected: ₹${data.feeReport.kpis.totalCollected} • Pending: ₹${data.feeReport.kpis.totalPending}`,
      `Attendance: ${data.attendanceReport.kpis.overallAttendanceRate}% • Pass Rate: ${data.resultReport.kpis.overallPassRate}%`,
      `Revenue: ₹${data.profitLossReport.kpis.totalRevenue} • Expenses: ₹${data.profitLossReport.kpis.totalExpenses} • Net: ₹${data.profitLossReport.kpis.netProfit}`,
    ];
    kpis.forEach((line) => {
      doc.fontSize(9).font("Helvetica").fillColor("#334155").text(line);
      doc.moveDown(0.3);
    });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica-Bold").text("Recent Payments (Top 20)");
    doc.moveDown(0.3);
    data.feeReport.payments.slice(0, 20).forEach((p) => {
      if (doc.y > 750) doc.addPage();
      doc.fontSize(7).font("Helvetica").text(`${p.studentName} — ${p.courseName} — ₹${p.amount} — ${p.method} — ${p.paidAt.slice(0,10)}`);
    });
    doc.end();
    const pdf = await done;
    return new NextResponse(pdf as any, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="reports-export-${Date.now()}.pdf"` },
    });
  } else {
    const XLSX = require("xlsx");
    const wb = XLSX.utils.book_new();
    const payments = data.feeReport.payments.map((p) => ({ Student: p.studentName, Course: p.courseName, Amount: p.amount, Method: p.method, Date: p.paidAt.slice(0,10) }));
    const dues = data.feeReport.duesAging.slice(0, 200).map((d) => ({ Student: d.studentName, Course: d.courseName, Pending: d.pendingFee, DueDate: d.dueDate?.slice(0,10) || "", Overdue: d.isOverdue? "Yes":"No" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), "Payments");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dues), "Dues");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.attendanceReport.studentSummary.slice(0,200).map(s=>({Student:s.studentName,Course:s.courseName,Rate:s.attendanceRate+"%",Present:s.presentCount,Absent:s.absentCount}))), "Attendance");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.resultReport.tests.map(t=>({Test:t.title,Subject:t.subject,PassRate:t.passRate+"%",Avg:t.averageScore}))), "Tests");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="reports-export-${Date.now()}.xlsx"` },
    });
  }
}
