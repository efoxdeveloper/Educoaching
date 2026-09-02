"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { type FeatureFlags, DEFAULT_FEATURE_FLAGS } from "@/lib/institute-settings";
import { SlidersHorizontal, Loader2, Check } from "lucide-react";

type InstituteTarget = {
  id: string;
  name: string;
};

const FEATURE_DESCRIPTIONS: Record<keyof FeatureFlags, { label: string; desc: string }> = {
  onlineTests: {
    label: "Academic Exams & Results",
    desc: "Create tests, record evaluations, pass rates, and student exam scorecards.",
  },
  attendance: {
    label: "Attendance Tracking & Reports",
    desc: "Daily student attendance marking, low-attendance alerts, and trends.",
  },
  admissions: {
    label: "Admission Inquiries Pipeline",
    desc: "Track prospective student applications and convert inquiries into enrolled students.",
  },
  timetable: {
    label: "Timetable & Scheduling",
    desc: "Weekly schedule grid, classroom room assignments, and conflict clash prevention.",
  },
  reports: {
    label: "Executive Analytics & Reports",
    desc: "Full-stack basic reports hub with KPI cards, Recharts visualizations, and CSV exports.",
  },
  onlinePayments: {
    label: "Razorpay Online Payments",
    desc: "Allow students to pay course fees directly via credit/debit card and UPI checkout.",
  },
  multiBranch: {
    label: "Multi-Branch Campus Management",
    desc: "Configure multiple branch locations and campuses under this institute.",
  },
  expenses: {
    label: "Expense Management & Outflow",
    desc: "Log operational expenditures, category allocations, vendor payments, and CSV export.",
  },
  communication: {
    label: "Bulk Broadcasts & Notifications",
    desc: "Multi-channel broadcast messaging (WhatsApp, SMS, Email) with audience segmentation.",
  },
};

export function FeatureFlagsDrawer({
  institute,
  open,
  onClose,
  onUpdated,
}: {
  institute: InstituteTarget | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && institute) {
      setLoading(true);
      setError("");
      setSuccess(false);
      fetch(`/api/admin/institutes/${institute.id}/features`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load feature flags");
          return res.json();
        })
        .then((data) => {
          if (data.featureFlags) setFlags(data.featureFlags);
        })
        .catch(() => {
          setError("Could not load feature flags for this institute.");
        })
        .finally(() => setLoading(false));
    }
  }, [open, institute]);

  const handleToggle = (key: keyof FeatureFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!institute) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/institutes/${institute.id}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureFlags: flags }),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
      if (onUpdated) onUpdated();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch {
      setError("Failed to update feature flags.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={institute ? `Feature Controls: ${institute.name}` : "Feature Controls"}
      maxWidth="max-w-md"
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center text-xs text-scholar-400">
          <Loader2 size={20} className="animate-spin text-scholar-600 mr-2" />
          Loading module permissions...
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-scholar-500">
            Control which functional modules are enabled or disabled for this institute based on their subscription tier or custom contract.
          </p>

          {error && (
            <div className="rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-success-50 p-3 text-xs font-semibold text-success-700 flex items-center gap-1.5">
              <Check size={14} />
              Feature flags updated successfully!
            </div>
          )}

          <div className="divide-y divide-scholar-100 rounded-2xl border border-scholar-100 bg-white">
            {(Object.keys(FEATURE_DESCRIPTIONS) as (keyof FeatureFlags)[]).map((key) => {
              const info = FEATURE_DESCRIPTIONS[key];
              const enabled = flags[key];

              return (
                <div key={key} className="flex items-start justify-between gap-3 p-3.5 hover:bg-scholar-50/40 transition-colors">
                  <div className="pr-2">
                    <p className="text-xs font-semibold text-ink">{info.label}</p>
                    <p className="text-[11px] text-scholar-400 mt-0.5">{info.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enabled ? "bg-scholar-600" : "bg-scholar-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-scholar-100 py-2 text-xs font-semibold text-scholar-600 hover:bg-scholar-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-scholar-600 py-2 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <SlidersHorizontal size={13} />}
              {saving ? "Saving..." : "Apply Feature Flags"}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
