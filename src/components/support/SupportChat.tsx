"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, AlertCircle, Ticket } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Message = { role: "user" | "assistant"; content: string };

const ROLE_EXAMPLES: Record<string, string[]> = {
  OWNER: [
    "How do I add a new branch?",
    "How does impersonation work and how do I exit it?",
    "Why can't I see another branch's students without impersonating?",
    "How do I create a test with a time window?",
  ],
  ADMIN: [
    "How do I add a new branch?",
    "How does impersonation work and how do I exit it?",
    "Why can't I see another branch's students without impersonating?",
    "How do I create a test with a time window?",
  ],
  STAFF: [
    "How do I mark attendance?",
    "How do I assign a DPP to only some students?",
    "Why can't I see another branch's faculty?",
  ],
  FACULTY: [
    "How do I mark attendance?",
    "How do I assign a DPP to only some students?",
    "Why can't I see another branch's faculty?",
  ],
  STUDENT: [
    "How do I join a live class?",
    "Why can't I open this test after the end time?",
    "Why don't I see a DPP that was posted?",
  ],
  PARENT: [
    "How do I see my child's fee status?",
    "Why can't I join my child's live class?",
    "How do I see my other child's assignments if I have two kids here?",
  ],
};

export function SupportChat({ role }: { role: string }) {
  const normalizedRole = role.toUpperCase();
  const examples = ROLE_EXAMPLES[normalizedRole] || ROLE_EXAMPLES["STUDENT"];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError("");
    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");
      const assistantMsg: Message = { role: "assistant", content: data.answer || "Sorry, no response." };
      setMessages((prev) => [...prev, assistantMsg]);
      if (data.suggestedAction === "contact_admin") {
        // Hint is already in answer, but we could also auto-show ticket form
      }
    } catch (e: any) {
      setError(e.message || "Failed to contact support agent. Please try again or submit a ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-0 overflow-hidden flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-scholar-100 bg-scholar-50/50 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-scholar-700 text-white">
          <Bot size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-ink">Vidyalaya AI Support</p>
          <p className="text-[11px] text-scholar-500">Role: {normalizedRole} • Answers are scoped to your branch and permissions</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-scholar-600 bg-scholar-50 p-3 rounded-xl border border-scholar-100">
              Hi! I’m your Vidyalaya assistant. Ask me how to use the app for your role (<strong>{normalizedRole}</strong>). I can’t reveal other users’ data or bypass branch rules — I’ll guide you to the right screen and suggest contacting platform admin if needed.
            </p>
            <p className="text-[11px] font-semibold text-scholar-500">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => sendMessage(ex)}
                  className="text-left text-xs bg-white border border-scholar-200 rounded-full px-3 py-1.5 hover:bg-scholar-50 hover:border-scholar-300 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-scholar-700 text-white shrink-0 mt-0.5">
                <Bot size={12} />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-scholar-700 text-white" : "bg-scholar-50 border border-scholar-100 text-ink"}`}>
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-marigold-100 text-marigold-700 shrink-0 mt-0.5">
                <User size={12} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center text-xs text-scholar-500">
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          <AlertCircle size={14} /> <span>{error}</span>
        </div>
      )}

      <div className="p-3 border-t border-scholar-100 bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          placeholder={normalizedRole === "PARENT" ? "Ask about your child's fees, attendance..." : normalizedRole === "STUDENT" ? "Ask about joining live class, tests..." : "Ask about batches, attendance, fees..."}
          className="flex-1 rounded-xl border border-scholar-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-scholar-400"
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-scholar-700 p-2.5 text-white hover:bg-scholar-800 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
      <div className="px-3 pb-2 text-center text-[11px] text-scholar-400">
        If I can’t help, I’ll suggest <span className="inline-flex items-center gap-1 font-semibold"><Ticket size={11} /> Contact platform admin</span> — your ticket is logged with your branch context.
      </div>
    </Card>
  );
}
