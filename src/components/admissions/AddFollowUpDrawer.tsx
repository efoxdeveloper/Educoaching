"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { PhoneCall, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type FollowUpLog = {
  id: string;
  counsellor: string;
  callStatus: string;
  notes: string;
  scheduledAt: string | null;
  createdAt: string;
};

type LeadTarget = {
  id: string;
  applicantName: string;
  mobile: string;
  course: { name: string };
  stage: string;
  priority: string;
  followUps?: FollowUpLog[];
};

const CALL_STATUSES = [
  { value: "INTERESTED", label: "Interested / Highly Responsive" },
  { value: "CALL_BACK", label: "Requested Call Back Later" },
  { value: "VISIT_PLANNED", label: "Campus Visit Planned" },
  { value: "DEMO_BOOKED", label: "Trial Demo Booked" },
  { value: "NOT_REACHABLE", label: "Not Reachable / Busy" },
  { value: "ENROLLED", label: "Agreed to Enroll" },
  { value: "DROPPED", label: "Not Interested / Dropped" },
];

const STAGES = [
  { value: "NEW", label: "New Inquiry" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { value: "COUNSELLING", label: "Counselling" },
  { value: "ENROLLED", label: "Enrolled (Convert to Student)" },
  { value: "LOST", label: "Lost / Closed" },
];

type FacultyStaff = { id: string; name: string; roleType: string };

export function AddFollowUpDrawer({
  lead,
  open,
  onClose,
  userName,
  faculty = [],
  defaultCounsellorId,
  onSuccess,
}: {
  lead: LeadTarget | null;
  open: boolean;
  onClose: () => void;
  userName?: string;
  faculty?: FacultyStaff[];
  defaultCounsellorId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  const counsellorList = useMemo(() => {
    const counsellorsOnly = faculty.filter((f) => f.roleType === "COUNSELLOR");
    return counsellorsOnly.length > 0 ? counsellorsOnly : faculty;
  }, [faculty]);

  const defaultName = useMemo(() => {
    if (defaultCounsellorId) {
      const match = faculty.find((f) => f.id === defaultCounsellorId);
      if (match) return match.name;
    }
    if (userName) return userName;
    if (counsellorList.length > 0) return counsellorList[0].name;
    return "Academic Counsellor";
  }, [defaultCounsellorId, faculty, userName, counsellorList]);

  const [callStatus, setCallStatus] = useState("INTERESTED");
  const [counsellor, setCounsellor] = useState(defaultName);
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [nextStage, setNextStage] = useState(lead?.stage || "CONTACTED");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lead) {
      setNextStage(lead.stage === "NEW" ? "CONTACTED" : lead.stage);
      setNotes("");
      setScheduledAt("");
      setError("");
      setCounsellor(defaultName);
    }
  }, [lead, defaultName, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!notes.trim()) {
      setError("Please enter conversation notes / summary.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admissions/${lead.id}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counsellor,
          callStatus,
          notes: notes.trim(),
          scheduledAt: scheduledAt || null,
          nextStage,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save follow-up log");
      }

      onClose();
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record follow-up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Counselling & Follow-up Log"
      maxWidth="max-w-md"
    >
      {lead && (
        <div className="space-y-5">
          {/* Header Summary */}
          <div className="rounded-xl border border-scholar-100 bg-scholar-50/60 p-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink text-sm">{lead.applicantName}</span>
              <span className="rounded-full bg-white border border-scholar-200 px-2 py-0.5 font-semibold text-scholar-700">
                {lead.stage}
              </span>
            </div>
            <p className="text-scholar-500 mt-1">
              Course: <span className="font-semibold text-ink">{lead.course.name}</span> &middot; Mobile: <a href={`tel:${lead.mobile}`} className="text-scholar-600 hover:underline">{lead.mobile}</a>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger-700">
                {error}
              </div>
            )}

            <Field label="Call Disposition / Status *">
              <select
                className={inputClass}
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value)}
                required
              >
                {CALL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Counsellor Name *">
              {counsellorList.length > 0 ? (
                <select
                  className={inputClass}
                  value={counsellor}
                  onChange={(e) => setCounsellor(e.target.value)}
                  required
                >
                  {counsellorList.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.roleType === "COUNSELLOR" ? "(Counsellor)" : `(${c.roleType})`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  value={counsellor}
                  onChange={(e) => setCounsellor(e.target.value)}
                  placeholder="Counsellor name"
                  required
                />
              )}
            </Field>

            <Field label="Conversation Summary / Notes *">
              <textarea
                className={`${inputClass} min-h-[85px] py-2`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Student background, concerns discussed, fee interest, next steps..."
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Advance Pipeline Stage">
                <select
                  className={inputClass}
                  value={nextStage}
                  onChange={(e) => setNextStage(e.target.value)}
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Next Follow-up Date">
                <input
                  type="date"
                  className={inputClass}
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-xs font-semibold text-scholar-600 hover:bg-scholar-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                {loading ? "Saving..." : "Save Follow-up"}
              </button>
            </div>
          </form>

          {/* Previous History Timeline */}
          {lead.followUps && lead.followUps.length > 0 && (
            <div className="pt-4 border-t border-scholar-100">
              <h4 className="font-semibold text-xs text-ink mb-3">Previous Follow-up History ({lead.followUps.length})</h4>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {lead.followUps.map((f) => (
                  <div key={f.id} className="rounded-xl border border-scholar-100 bg-white p-3 text-xs space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-[11px] text-scholar-400">
                      <span className="font-semibold text-scholar-700">{f.counsellor}</span>
                      <span>{formatDate(f.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-scholar-100 px-1.5 py-0.5 text-[10px] font-bold text-scholar-800">
                        {f.callStatus.replace("_", " ")}
                      </span>
                      {f.scheduledAt && (
                        <span className="text-[10px] text-scholar-500">
                          Next call: {formatDate(f.scheduledAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-scholar-600 text-xs">{f.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
