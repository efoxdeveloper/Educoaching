import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranchImpersonationState, requireInstitute } from "@/lib/tenant";
import { getRelevantKbSections, buildSystemPrompt } from "@/lib/support-kb";
import { logAudit, actorFromSession } from "@/lib/audit";

// In-memory rate limit + conversation log (per user)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const chatLog: Array<{ userId: string; role: string; instituteId: string | null; branchId: string | null; question: string; answer: string; at: string }> = [];

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false; // 10/min
  entry.count++;
  return true;
}

async function getDataAwareContext(user: any, instituteId: string, branchId: string, question: string): Promise<string> {
  const q = question.toLowerCase();
  let ctx = "";
  try {
    // Only read OWN data, scoped by branchId
    if (q.includes("fee") && (q.includes("overdue") || q.includes("pending") || q.includes("my fee") || q.includes("why") )) {
      // Find own student record(s)
      const students = await prisma.student.findMany({
        where: { instituteId, branchId, email: user.email } as any,
        select: { name: true, totalFee: true, paidFee: true, dueDate: true, plan: true },
        take: 1,
      });
      if (students.length) {
        const s = students[0] as any;
        ctx += `\n[CONTEXT] Your fee record: ${s.name} totalFee=${s.totalFee} paidFee=${s.paidFee} dueDate=${s.dueDate} plan=${s.plan}. Use this to explain overdue status, never reveal other students.`;
      }
    }
    if (q.includes("test") && (q.includes("when") || q.includes("next") || q.includes("my test"))) {
      const student = await prisma.student.findFirst({ where: { instituteId, branchId, email: user.email } as any, select: { id: true, batchId: true } });
      if (student?.batchId) {
        const upcoming = await prisma.test.findMany({
          where: { instituteId, branchId, batchId: student.batchId, testDate: { gte: new Date() } },
          select: { title: true, testDate: true, startTime: true, endTime: true },
          take: 3,
          orderBy: { testDate: "asc" },
        });
        if (upcoming.length) {
          ctx += `\n[CONTEXT] Your upcoming tests (branch ${branchId}): ${upcoming.map(t=> `${t.title} on ${t.testDate.toISOString().slice(0,10)} ${t.startTime ? new Date(t.startTime).toISOString().slice(11,16) : ""}-${t.endTime ? new Date(t.endTime).toISOString().slice(11,16) : ""}`).join("; ")}.`;
        }
      }
    }
    if (q.includes("attendance")) {
      const student = await prisma.student.findFirst({ where: { instituteId, branchId, email: user.email } as any, select: { id: true } });
      if (student) {
        const records = await prisma.attendance.findMany({ where: { studentId: student.id }, select: { status: true }, take: 20 });
        const present = records.filter(r=>r.status==="PRESENT").length;
        ctx += `\n[CONTEXT] Your recent attendance: ${present}/${records.length} present.`;
      }
    }
  } catch {}
  return ctx;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user: any = session.user;
  const userId = user.id as string;
  const role = String(user.role || "").toUpperCase();
  const instituteId = user.instituteId as string | null;

  // Branch context via existing helper (respects impersonation)
  let branchId: string | null = null;
  let branchName: string | null = null;
  try {
    const branchState = await getBranchImpersonationState();
    branchId = branchState.branchId;
    branchName = branchState.branch?.name ?? null;
  } catch {}

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "Rate limited. Please wait a minute and try again." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { message, history } = body as { message?: string; history?: Array<{ role: string; content: string }> };
  if (!message || !String(message).trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  const question = String(message).trim().slice(0, 2000);

  // Guardrail: block attempts to bypass isolation
  const lowerQ = question.toLowerCase();
  const bypassPhrases = ["without impersonating", "bypass branch", "see another branch", "view another branch", "without permission", "workaround"];
  const isBypassAttempt = bypassPhrases.some(p => lowerQ.includes(p)) && (lowerQ.includes("branch") || lowerQ.includes("see"));
  // We don't auto-block, but system prompt already instructs to explain restriction. We just ensure we don't leak.

  const relevantKb = getRelevantKbSections(question, role);
  const dataAwareCtx = instituteId && branchId ? await getDataAwareContext(user, instituteId, branchId, question) : "";
  const systemPrompt = buildSystemPrompt(role, branchName, relevantKb);

  const userContent = question + dataAwareCtx;

  // Build Anthropic request
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let answer = "";
  let modelUsed = "mock";

  if (!apiKey) {
    // Mock mode when no key (for local dev / tests) — still role-scoped and guardrailed
    if (lowerQ.includes("another branch") || lowerQ.includes("without impersonating")) {
      answer = "Branch data is strictly isolated by design. As a " + role + ", you can only see data for your active branch (`" + (branchName || "current branch") + "`). Owners/Admins must use **Branches → Impersonate** to view another branch's data, which creates a per-session impersonation (4h expiry, audit logged, banner shown). There is no supported workaround — please use impersonation or contact platform admin via Support Ticket.";
    } else if (role === "OWNER" && lowerQ.includes("impersonat")) {
      answer = "Impersonation lets you temporarily view as another branch: Go to **Branches** → click **⚡ Impersonate & Manage Branch View** on the target branch card. A purple banner appears: `Main Campus Impersonation — Viewing as [Branch Name]` with an **Exit to Main Campus** button. It's per-session (JWT, tied to your userId), auto-expires after 4 hours or on logout, and is audit-logged. Other users are not affected.";
    } else if (role === "STUDENT" && lowerQ.includes("test") && lowerQ.includes("end time")) {
      answer = "Tests have a server-enforced time window (e.g., 9–10 AM). If `now > endTime` (server time), the start endpoint rejects with `Test window has closed` and marks it **Missed**, and any submission after endTime is blocked/auto-closed as `TIMED_OUT`. You cannot start late even if you have the direct link.";
    } else if (role === "PARENT" && lowerQ.includes("live class") && lowerQ.includes("join")) {
      answer = "Parents have view-only access to live classes: you can see scheduled classes for your linked children's batches, but the **Join** button is hidden for Parent role and the server blocks `PARENT` from joining (meetingLink is stripped). Only the student account can join. If your child should be in a different batch, contact the institute admin.";
    } else {
      answer = `As a ${role} in ${branchName || "your branch"}, here's how to proceed in this app:\n\n` + relevantKb.slice(0, 600) + `\n\nIf this doesn't resolve it, please use **Contact platform admin** below to submit a support ticket — include institute and branch details and our team will help.`;
    }
  } else {
    try {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
          max_tokens: 800,
          system: systemPrompt,
          messages: [
            ...(Array.isArray(history) ? history.slice(-6).map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content.slice(0, 1000) })) : []),
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        throw new Error(`Anthropic ${anthropicRes.status}: ${errText}`);
      }
      const data = await anthropicRes.json();
      answer = data?.content?.[0]?.text || "Sorry, I couldn't generate a response. Please contact platform admin via support ticket.";
      modelUsed = data?.model || modelUsed;
    } catch (e: any) {
      console.error("Anthropic error:", e);
      answer = "I'm having trouble contacting the AI service right now. Please try again shortly, or use **Contact platform admin** to submit a support ticket with your institute and branch details.";
    }
  }

  // Log per user (for abuse/quality monitoring) — respect branch scope, never log other users' PII
  const logEntry = { userId, role, instituteId, branchId, question: question.slice(0, 500), answer: answer.slice(0, 2000), at: new Date().toISOString(), model: modelUsed };
  chatLog.push(logEntry);
  if (chatLog.length > 500) chatLog.shift();
  // Also audit log (optional, for platform admin review)
  try {
    await logAudit({
      instituteId: instituteId || undefined as any,
      actor: actorFromSession(session as any),
      action: "SUPPORT_CHAT",
      entityType: "SupportChat",
      entityId: userId,
      metadata: { role, branchId, question: question.slice(0, 200), answerLength: answer.length, isBypassAttempt },
    });
  } catch {}

  return NextResponse.json({
    answer,
    role,
    branchName,
    suggestedAction: answer.toLowerCase().includes("contact platform admin") || answer.toLowerCase().includes("support ticket") ? "contact_admin" : null,
  });
}

export async function GET() {
  return NextResponse.json({ status: "ok", model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022", hasKey: Boolean(process.env.ANTHROPIC_API_KEY) });
}
