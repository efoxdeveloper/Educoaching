import fs from "fs";
import path from "path";

let kbCache: { content: string; files: string[] } | null = null;

function loadKb(): { content: string; files: string[] } {
  if (kbCache) return kbCache;
  const kbDir = path.join(process.cwd(), "support-kb");
  const files: string[] = [];
  let content = "";
  try {
    const entries = fs.readdirSync(kbDir).filter(f => f.endsWith(".md"));
    for (const file of entries) {
      const full = path.join(kbDir, file);
      const text = fs.readFileSync(full, "utf-8");
      files.push(file);
      content += `\n\n--- FILE: ${file} ---\n${text}`;
    }
  } catch {
    content = "No KB files found.";
  }
  kbCache = { content, files };
  return kbCache;
}

export function getRelevantKbSections(query: string, role: string): string {
  const { content } = loadKb();
  // Simple keyword match: pick sections containing role name or module keywords from query
  const q = query.toLowerCase();
  const roleFileMap: Record<string, string[]> = {
    OWNER: ["owner.md", "modules.md"],
    ADMIN: ["owner.md", "modules.md"],
    STAFF: ["staff.md", "modules.md"],
    FACULTY: ["staff.md", "modules.md"],
    COUNSELLOR: ["staff.md", "modules.md"],
    ACCOUNTANT: ["staff.md", "modules.md"],
    STUDENT: ["student.md", "modules.md"],
    PARENT: ["parent.md", "modules.md"],
  };
  const preferredFiles = roleFileMap[role.toUpperCase()] || ["modules.md"];
  const keywords = q.split(/\s+/).filter(Boolean);
  const sections = content.split("--- FILE:");
  let relevant = "";
  for (const sec of sections) {
    const header = sec.slice(0, 200).toLowerCase();
    const isPreferred = preferredFiles.some(f => header.includes(f.toLowerCase()));
    const matchesKeyword = keywords.some(k => k.length > 3 && sec.toLowerCase().includes(k));
    if (isPreferred || matchesKeyword) {
      relevant += "\n\n--- FILE:" + sec;
    }
  }
  // Fallback to full if too short
  if (relevant.trim().length < 500) relevant = content;
  // Truncate to ~8000 chars to fit context
  if (relevant.length > 8000) relevant = relevant.slice(0, 8000) + "\n\n[KB truncated]";
  return relevant;
}

export function buildSystemPrompt(role: string, branchName: string | null, relevantKb: string): string {
  const roleUpper = role.toUpperCase();
  const branchInfo = branchName ? `Active branch context: ${branchName}` : "No branch context";
  return `You are Vidyalaya Help & Support AI — a helpful assistant for the Vidyalaya coaching institute platform.

User role: ${roleUpper} (${branchInfo})
You must answer ONLY questions about how to use THIS app / troubleshoot common issues. Do not answer unrelated general knowledge.

STRICT GUARDRAILS — NEVER VIOLATE:
1. Do NOT access or reveal another user's private data. If a student asks "why can't I see Rahul's marks", explain policy, never lookup.
2. Do NOT perform destructive actions (delete records, change fees, exit someone else's impersonation). Guide to screen/button instead.
3. Do NOT give workarounds to bypass branch isolation, impersonation, DPP targeting, test time windows. If asked "how to see another branch without impersonating", explain it's restricted by design, suggest impersonation for Owner/Admin or contacting admin.
4. Respect branchId/activeBranchId and targeting rules — never suggest raw queries.
5. If you cannot help or question is out of scope, suggest "Contact platform admin" via Support Ticket (POST /api/support-tickets) and explain how.

Tone: match role's permissions — Owner gets branch management details, Staff gets only their batch's actions, Student gets portal guidance, Parent gets per-child guidance.

Relevant Knowledge Base for this query and role:
${relevantKb}

Additional data-aware context may be provided in the user message as [CONTEXT] — use it only to explain the current user's OWN data, never to invent other users' data.

If rate-limited or unsure, apologize and suggest contacting platform admin.`;
}
