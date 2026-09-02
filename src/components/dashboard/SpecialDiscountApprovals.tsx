"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Check, X, ShieldAlert, Percent, User, Phone, BookOpen, AlertCircle } from "lucide-react";

export type DiscountRequestItem = {
  id: string;
  studentId: string | null;
  studentName: string;
  studentMobile: string | null;
  courseId: string;
  courseName: string;
  originalFee: number;
  discountPercent: number;
  discountAmount: number;
  finalFee: number;
  reason: string | null;
  requestedByRole: string;
  requestedByName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decisionNotes: string | null;
  decisionAt: string | null;
  decisionByName: string | null;
  createdAt: string;
};

export function SpecialDiscountApprovals({
  initialRequests,
}: {
  initialRequests: DiscountRequestItem[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<DiscountRequestItem[]>(initialRequests);
  const [activeFilter, setActiveFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<{ [id: string]: string }>({});

  const handleDecision = async (id: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(id);
    try {
      const decisionNotes = noteInput[id] || "";
      const res = await fetch(`/api/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, decisionNotes }),
      });

      if (!res.ok) throw new Error();

      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: action === "APPROVE" ? "APPROVED" : "REJECTED",
                decisionNotes,
                decisionAt: new Date().toISOString(),
              }
            : r
        )
      );
      router.refresh();
    } catch {
      alert("Failed to process decision. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    if (activeFilter === "ALL") return true;
    return r.status === activeFilter;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <Percent size={18} className="text-marigold-600" />
              Special Discount Approvals (&gt;30%)
            </h3>
            {pendingCount > 0 && (
              <span className="flex h-5 items-center justify-center rounded-full bg-amber-500 px-2 text-[11px] font-extrabold text-white animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-scholar-500 mt-0.5">
            Faculty and counsellors can self-apply up to 30%. Discounts exceeding 30% require Owner allowance.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-scholar-100/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter("PENDING")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              activeFilter === "PENDING"
                ? "bg-white text-scholar-900 shadow-xs"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("APPROVED")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              activeFilter === "APPROVED"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            Allowed
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("REJECTED")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              activeFilter === "REJECTED"
                ? "bg-white text-danger-700 shadow-xs"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            Declined
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
              activeFilter === "ALL"
                ? "bg-white text-scholar-900 shadow-xs"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-scholar-200 bg-paper/40">
          <ShieldAlert size={28} className="mx-auto text-scholar-300 mb-1.5" />
          <p className="text-xs font-semibold text-scholar-600">No discount requests in this view</p>
          <p className="text-[11px] text-scholar-400 mt-0.5">
            When staff requests more than 30% discount for a student, it will appear here for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isPending = req.status === "PENDING";
            return (
              <div
                key={req.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  isPending
                    ? "border-amber-200 bg-amber-50/40"
                    : req.status === "APPROVED"
                    ? "border-emerald-200 bg-emerald-50/20"
                    : "border-scholar-200 bg-scholar-50/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-sm flex items-center gap-1.5">
                        <User size={14} className="text-scholar-400" />
                        {req.studentName}
                      </span>
                      {req.studentMobile && (
                        <span className="text-xs text-scholar-500 flex items-center gap-1">
                          <Phone size={12} className="text-scholar-400" />
                          {req.studentMobile}
                        </span>
                      )}
                      <Badge
                        tone={
                          req.status === "APPROVED"
                            ? "success"
                            : req.status === "REJECTED"
                            ? "danger"
                            : "warn"
                        }
                      >
                        {req.status === "PENDING"
                          ? "Pending Owner Action"
                          : req.status === "APPROVED"
                          ? "Allowed / Approved"
                          : "Declined"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-scholar-600">
                      <span className="flex items-center gap-1 font-medium text-scholar-700">
                        <BookOpen size={13} className="text-scholar-400" />
                        {req.courseName}
                      </span>
                      <span>•</span>
                      <span>
                        Original Fee: <strong>{formatCurrency(req.originalFee)}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                        Requested: {req.discountPercent}% Off (-{formatCurrency(req.discountAmount)})
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">
                        Final Fee: {formatCurrency(req.finalFee)}
                      </span>
                    </div>

                    {req.reason && (
                      <div className="mt-2 rounded-lg bg-white/90 p-2 text-xs border border-scholar-100">
                        <span className="font-semibold text-scholar-700">Faculty/Staff Justification: </span>
                        <span className="text-scholar-600">{req.reason}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-scholar-400">
                      Requested by {req.requestedByName || "Faculty"} on {formatDate(req.createdAt)}
                    </p>
                  </div>

                  {/* Owner Action Buttons */}
                  {isPending && (
                    <div className="flex flex-col gap-2 shrink-0 sm:min-w-[200px]">
                      <input
                        type="text"
                        placeholder="Optional decision note..."
                        value={noteInput[req.id] || ""}
                        onChange={(e) =>
                          setNoteInput({ ...noteInput, [req.id]: e.target.value })
                        }
                        className="rounded-lg border border-scholar-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-scholar-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleDecision(req.id, "APPROVE")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-xs"
                        >
                          <Check size={14} /> Allow
                        </button>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleDecision(req.id, "REJECT")}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-danger-300 bg-white px-3 py-1.5 text-xs font-semibold text-danger-700 hover:bg-danger-50 disabled:opacity-60 transition-colors"
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {!isPending && req.decisionAt && (
                    <div className="text-right text-xs text-scholar-400 shrink-0">
                      <p className="font-semibold text-scholar-600">
                        Decision logged by {req.decisionByName || "Owner"}
                      </p>
                      <p>{formatDate(req.decisionAt)}</p>
                      {req.decisionNotes && (
                        <p className="text-[11px] text-scholar-500 italic mt-0.5">&quot;{req.decisionNotes}&quot;</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
