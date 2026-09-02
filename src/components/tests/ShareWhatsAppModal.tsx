"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Copy, Check, Share2, Send } from "lucide-react";
import type { TestSummary } from "./TestsView";

export function ShareWhatsAppModal({
  open,
  onClose,
  test,
}: {
  open: boolean;
  onClose: () => void;
  test: TestSummary | null;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!test) return null;

  const examLink = `${origin}/exam/${test.id}`;

  const examSchedule = (() => {
    if (!test.startTime) return null;
    const s = new Date(test.startTime);
    if (isNaN(s.getTime())) return null;
    const sStr = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (!test.endTime) return `${sStr} onwards`;
    const e = new Date(test.endTime);
    const eStr = !isNaN(e.getTime()) ? e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
    return eStr ? `${sStr} - ${eStr}` : sStr;
  })();

  const messageText = `*Dear Student,*
Your online examination for *${test.title}* is now active!

📋 *Exam Details:*
• Subject: ${test.subject || "General"}
• Batch: ${test.batchName}${examSchedule ? `\n• Timing: ${examSchedule}` : ""}
• Duration: ${test.durationMinutes || 60} Minutes
• Total Marks: ${test.totalMarks} Marks
• Negative Marking: -${test.negativeMarks !== null ? test.negativeMarks : 1} per incorrect answer

👉 *Click here to fill your credentials & start the exam:*
${examLink}

_Best of luck for your exam!_`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(examLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <Drawer open={open} onClose={onClose} title="Share Online Exam on WhatsApp" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
          <p className="font-semibold flex items-center gap-1.5 text-emerald-800">
            <Share2 size={15} /> Instant WhatsApp Student Invitation
          </p>
          <p className="mt-1 text-emerald-700">
            Send this link directly to your students or broadcast groups. Students tap the link, fill their Name & Mobile, and immediately take the timed CBT exam!
          </p>
        </div>

        {/* Direct Link Section */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-scholar-700">Direct Exam Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={examLink}
              className="flex-1 rounded-xl border border-scholar-200 bg-scholar-50 p-2 text-xs font-mono text-scholar-800 select-all outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 rounded-xl border border-scholar-200 bg-white px-3 py-2 text-xs font-semibold text-scholar-700 hover:bg-scholar-50"
            >
              {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedLink ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Formatted Message Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-scholar-700">
              WhatsApp Message Preview
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] font-semibold text-scholar-600 hover:underline flex items-center gap-1"
            >
              {copiedMessage ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              {copiedMessage ? "Message Copied!" : "Copy Full Message"}
            </button>
          </div>

          <div className="rounded-xl border border-scholar-200 bg-scholar-50 p-3.5 text-xs text-scholar-800 whitespace-pre-wrap font-sans leading-relaxed">
            {messageText}
          </div>
        </div>

        {/* Launch WhatsApp Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Send size={15} />
            Launch WhatsApp & Send to Students
          </button>
        </div>
      </div>
    </Drawer>
  );
}
