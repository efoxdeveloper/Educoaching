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
    // Mock mode when no key (for local dev / tests) — still role-scoped and guardrailed, but in plain, classroom-style language
    if (lowerQ.includes("another branch") || lowerQ.includes("without impersonating")) {
      if (role === "PARENT" || role === "STUDENT") {
        answer = `I understand it's confusing when you can't see something you expected.\n\nHere's why this happens: Each centre keeps its own records in a separate folder, like separate classrooms that don't share notebooks. This keeps every child's information private and safe.\n\nThat's why you only see the information for your own centre — "${branchName || "your current centre"}".\n\nIf you think you should see more, the best next step is to contact your institute. They can check which centre you or your child is linked to and help you.\n\nIf this doesn't fix it, tap 'Contact platform admin' below and someone will help you directly.`;
      } else {
        answer = `You're seeing only one centre right now because each branch's information is kept separate for privacy — like separate folders for each centre.\n\nTo look at another centre's information, you first need to switch your view. Here's how to do it, step by step:\n\n1. Tap **Branches** in the menu at the top.\n2. You'll see a list of your centres.\n3. Find the centre you want to see and tap the button that says **Impersonate** or **Manage Branch View**.\n4. The screen will change and you'll see a banner at the top that says you're now viewing that centre. You can tap **Exit** at any time to come back.\n\nThis view only lasts for your current login and will go back to normal after a few hours or if you log out. Other teachers or parents won't be affected.\n\nIf this doesn't fix it, tap 'Contact platform admin' below and someone will help you directly.`;
      }
    } else if (lowerQ.includes("impersonat")) {
      if (role === "PARENT" || role === "STUDENT") {
        answer = `Impersonation is not something students or parents use.\n\nThink of it like this: the main office can temporarily look through another centre's window to help with that centre's work — like borrowing their view for a little while. They can switch back anytime.\n\nAs a ${role.toLowerCase()}, you don't need to do this. You automatically see only your own centre's information, which is exactly how it should be.\n\nIf you were expecting to see something else, please tap 'Contact platform admin' below and let us know what you were trying to find.`;
      } else {
        answer = `Here's how switching views works, step by step:\n\n1. First, tap **Branches** in the left menu.\n2. You'll see all your centres listed as cards.\n3. Find the centre you want to look at and tap **⚡ Impersonate & Manage Branch View**.\n4. After that, the top of your screen will show a banner like "Viewing as South Extension Branch". Now everything you see — students, batches, fees — is from that centre's view.\n5. When you're done, just tap **Exit to Main Campus** on that banner to come back.\n\nWhy does it work this way? Each centre's information is kept separate to keep it safe. Switching your view lets you borrow that centre's view for a little while without mixing anything up. It only lasts for you, on this device, for a few hours, and then it goes back on its own. Other staff or parents won't see any change.\n\nIf this doesn't fix it, tap 'Contact platform admin' below and someone will help you directly.`;
      }
    } else if (role === "STUDENT" && lowerQ.includes("test") && lowerQ.includes("end time")) {
      answer = `I know it's frustrating when a test won't open.\n\nHere's what happened, step by step:\n\n1. Every online test has a set time to be taken — for example, 9 in the morning until 10 in the morning.\n2. The app checks the real time on its own clock (not the time on your phone or computer).\n3. If you try to start after 10 o'clock, it won't let you start and will mark it as **Missed**.\n4. If you were already inside the test and the clock passes 10 o'clock while you're still answering, it will close by itself and stop accepting answers.\n\nThis is to make it fair for everyone, so no one can keep answering after the time is up — even if you have the direct link, it will still be blocked.\n\nIf you missed your window by just a minute or two and think there was a problem, tap 'Contact platform admin' below and tell us which test it was. We'll check and help you.`;
    } else if (role === "PARENT" && lowerQ.includes("live class") && lowerQ.includes("join")) {
      answer = `I understand you want to help your child join the class.\n\nHere's how live classes work for parents:\n\n1. You can **see** when a live class is scheduled for your child's batch — it will appear in your view so you know it's happening.\n2. But the **Join** button is only for your child to tap from their own student login. This is to make sure the right student joins the right class.\n3. As a parent, you won't see a Join button, and even if you try to open the link directly, it is blocked for parent accounts.\n\nYour child should log in with their own student email to see the Join button and enter the class.\n\nIf your child should be in a different batch or you can't see their class at all, tap 'Contact platform admin' below and let us know your child's name and batch. We'll check it for you.`;
    } else if (lowerQ.includes("whatsapp") && (lowerQ.includes("not") || lowerQ.includes("send") || lowerQ.includes("reminder"))) {
      answer = `I know it's worrying when a WhatsApp message doesn't arrive.\n\nHere's what happens behind the scenes, in simple words:\n\nThis app sends WhatsApp messages through a special messaging service that needs to be fully set up on your institute's account first — like needing to connect a phone line before you can make calls.\n\nIf that service isn't fully set up yet, the messages won't go out. This isn't something you need to fix yourself.\n\nWhat you can do:\n\n1. First, check if you received the message in your regular app notifications (the bell icon).\n2. If you still need help, tap 'Contact platform admin' below and tell us which child's reminder you were expecting. We'll check the setup for you and make sure it gets sorted.\n\nIf this doesn't fix it, tap 'Contact platform admin' below and someone will help you directly.`;
    } else {
      // Generic fallback — make it plain and friendly, not technical
      const kbSnippet = relevantKb.slice(0, 500).replace(/branchId|API|endpoint|JWT|database/gi, "branch").trim();
      if (role === "PARENT") {
        answer = `Thanks for your question! Here's how it works for parents, step by step:\n\n` + kbSnippet + `\n\nI kept this short so it's easy to follow. If you'd like me to walk you through it again with your child's specific details, just let me know.\n\nIf this doesn't fix it, tap 'Contact platform admin' below and someone will help you directly.`;
      } else if (role === "STUDENT") {
        answer = `Got it! Here's what to do, step by step:\n\n` + kbSnippet + `\n\nLet me know which part you'd like me to explain a bit more, and I'll walk you through it again.\n\nIf this doesn't fix it, tap 'Contact platform admin' below and someone will help you directly.`;
      } else {
        answer = `Here's how to do this in your branch — "${branchName || "your current branch"}" — step by step:\n\n` + kbSnippet + `\n\nEach branch keeps its information separate so nothing gets mixed up. That's why you only see your own branch's information here.\n\nIf this doesn't fix it, tap 'Contact platform admin' below and someone will help you directly.`;
      }
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
