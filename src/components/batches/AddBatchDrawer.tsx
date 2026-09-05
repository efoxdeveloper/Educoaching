"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Field, inputClass } from "@/components/ui/Field";
import { Building2, Check, Clock, Users, ArrowRight, Copy } from "lucide-react";

type Course = { id: string; name: string };
type Branch = { id: string; name: string; city?: string | null };

function formatTime12h(time24: string): string {
  if (!time24) return "";
  const parts = time24.split(":");
  if (parts.length < 2) return time24;
  let h = parseInt(parts[0], 10);
  if (isNaN(h)) return time24;
  const m = parts[1] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h.toString().padStart(2, "0")}:${m} ${ampm}`;
}

export function AddBatchDrawer({
  open,
  onClose,
  courses,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    courseId: courses[0]?.id || "",
    timing: "08:00 AM - 10:00 AM",
    capacity: "40",
    status: "Active",
  });

  // Base Clock Time Picker state (24-hour format for input type="time")
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");

  const [isAllBranches, setIsAllBranches] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(
    branches[0]?.id ? [branches[0].id] : []
  );

  // Branch-specific capacity map: { [branchId]: string }
  const [branchCapacities, setBranchCapacities] = useState<Record<string, string>>({});
  // Branch-specific timing map: { [branchId]: string }
  const [branchTimings, setBranchTimings] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync formatted timing when startTime or endTime changes
  const updateTimingFromClocks = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    if (newStart && newEnd) {
      const formatted = `${formatTime12h(newStart)} - ${formatTime12h(newEnd)}`;
      setForm((prev) => ({ ...prev, timing: formatted }));
    }
  };

  const activeBranchList = useMemo(() => {
    if (isAllBranches) return branches;
    return branches.filter((b) => selectedBranchIds.includes(b.id));
  }, [branches, isAllBranches, selectedBranchIds]);

  // Compute total capacity when multi-branch is used
  const totalCapacity = useMemo(() => {
    if (activeBranchList.length <= 1) {
      return Number(form.capacity) || 40;
    }
    return activeBranchList.reduce((sum, b) => {
      const cap = Number(branchCapacities[b.id]) || Number(form.capacity) || 40;
      return sum + cap;
    }, 0);
  }, [activeBranchList, branchCapacities, form.capacity]);

  const toggleBranch = (id: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const selectAllBranches = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
  };

  const clearAllBranches = () => {
    setSelectedBranchIds([]);
  };

  const handleBranchCapacityChange = (branchId: string, value: string) => {
    setBranchCapacities((prev) => ({ ...prev, [branchId]: value }));
  };

  const handleBranchTimingChange = (branchId: string, value: string) => {
    setBranchTimings((prev) => ({ ...prev, [branchId]: value }));
  };

  const applyDefaultCapacityToAll = () => {
    const base = form.capacity || "40";
    const newMap: Record<string, string> = {};
    activeBranchList.forEach((b) => {
      newMap[b.id] = base;
    });
    setBranchCapacities(newMap);
  };

  const applyBaseTimingToAll = () => {
    const baseTiming = form.timing || "08:00 AM - 10:00 AM";
    const newMap: Record<string, string> = {};
    activeBranchList.forEach((b) => {
      newMap[b.id] = baseTiming;
    });
    setBranchTimings(newMap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isAllBranches && selectedBranchIds.length === 0 && branches.length > 0) {
      setError("Please select at least one campus branch or check 'All Branches'.");
      return;
    }

    setLoading(true);
    try {
      // Build branchCapacities & branchTimings objects
      const finalBranchCapacities: Record<string, number> = {};
      const finalBranchTimings: Record<string, string> = {};

      if (activeBranchList.length > 1) {
        activeBranchList.forEach((b) => {
          finalBranchCapacities[b.id] = Number(branchCapacities[b.id]) || Number(form.capacity) || 40;
          finalBranchTimings[b.id] = branchTimings[b.id] || form.timing;
        });
      }

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: totalCapacity,
          branchCapacities: Object.keys(finalBranchCapacities).length > 0 ? finalBranchCapacities : undefined,
          branchTimings: Object.keys(finalBranchTimings).length > 0 ? finalBranchTimings : undefined,
          branchIds: isAllBranches ? [] : selectedBranchIds,
          isAllBranches,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not add batch");
      }

      setForm({
        name: "",
        courseId: courses[0]?.id || "",
        timing: "08:00 AM - 10:00 AM",
        capacity: "40",
        status: "Active",
      });
      setIsAllBranches(false);
      setSelectedBranchIds(branches[0]?.id ? [branches[0].id] : []);
      setBranchCapacities({});
      setBranchTimings({});
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add batch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add Batch (Multi-Branch Allocation)">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && <p className="rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-600">{error}</p>}

        <Field label="Batch Name *">
          <input
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Morning Batch A / JEE Droppers"
          />
        </Field>

        <Field label="Course Program *">
          <select
            required
            className={inputClass}
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Multi-Branch Campus Allocation */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
              <Building2 size={14} className="text-scholar-600" />
              <span>Campus Branch Allocation</span>
            </label>
            {branches.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllBranches}
                  className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={clearAllBranches}
                  className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {branches.length === 0 ? (
            <p className="text-xs text-scholar-500 bg-scholar-50 p-2.5 rounded-lg border border-scholar-100">
              This institute has only one branch (Main Branch) — no branch selection needed.
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs font-semibold text-scholar-700 cursor-pointer bg-white p-2 rounded-lg border border-scholar-200 shadow-2xs">
                <input
                  type="checkbox"
                  checked={isAllBranches}
                  onChange={(e) => setIsAllBranches(e.target.checked)}
                  className="h-4 w-4 rounded text-scholar-600 focus:ring-scholar-500"
                />
                <span>All Branches / Central Hybrid Program (Conduct in all campuses)</span>
              </label>

              {!isAllBranches && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-scholar-500">
                    Select the branches conducting this batch:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {branches.map((b) => {
                      const isSelected = selectedBranchIds.includes(b.id);
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => toggleBranch(b.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-scholar-600 text-white border-scholar-600 font-semibold shadow-xs"
                              : "bg-white text-scholar-700 border-scholar-200 hover:bg-scholar-50"
                          }`}
                        >
                          <span className="truncate">
                            {b.name} {b.city ? `(${b.city})` : ""}
                          </span>
                          {isSelected && <Check size={14} className="shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Primary Clock Time Picker */}
        <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
              <Clock size={14} className="text-scholar-600" />
              <span>Batch Timing (Clock Time Setter) *</span>
            </label>
            <span className="rounded-md bg-scholar-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs">
              {form.timing || "Set Time"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-scholar-600 mb-1 block">Start Time (Clock)</label>
              <div className="relative">
                <input
                  type="time"
                  required
                  className={`${inputClass} font-semibold`}
                  value={startTime}
                  onChange={(e) => updateTimingFromClocks(e.target.value, endTime)}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-scholar-600 mb-1 block">End Time (Clock)</label>
              <div className="relative">
                <input
                  type="time"
                  required
                  className={`${inputClass} font-semibold`}
                  value={endTime}
                  onChange={(e) => updateTimingFromClocks(startTime, e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-1">
            <label className="text-[10px] text-scholar-500 mb-0.5 block">Formatted Schedule Label (or fine-tune text):</label>
            <input
              required
              className={inputClass}
              value={form.timing}
              onChange={(e) => setForm({ ...form, timing: e.target.value })}
              placeholder="e.g. 08:00 AM - 10:00 AM"
            />
          </div>
        </div>

        {/* Multi-Branch Independent Timing & Capacity Section */}
        {activeBranchList.length > 1 ? (
          <div className="rounded-xl border border-scholar-200 bg-scholar-50/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-scholar-800 flex items-center gap-1.5">
                  <Building2 size={14} className="text-scholar-600" />
                  <span>Branch-Specific Timings & Capacities</span>
                </label>
                <p className="text-[11px] text-scholar-500 mt-0.5">
                  Custom schedule & seat capacity for each branch center:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyBaseTimingToAll}
                  title="Copy base timing to all branches"
                  className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                >
                  Sync Timings
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={applyDefaultCapacityToAll}
                  title="Copy base capacity to all branches"
                  className="text-[10px] text-scholar-600 font-semibold hover:underline cursor-pointer"
                >
                  Sync Capacities
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activeBranchList.map((b) => {
                const branchCap = branchCapacities[b.id] !== undefined ? branchCapacities[b.id] : form.capacity || "40";
                const branchTime = branchTimings[b.id] !== undefined ? branchTimings[b.id] : form.timing;

                return (
                  <div
                    key={b.id}
                    className="bg-white p-2.5 rounded-xl border border-scholar-200 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink truncate">
                        📍 {b.name} {b.city ? `(${b.city})` : ""}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-scholar-500 font-medium">Seats:</span>
                        <input
                          type="number"
                          min={1}
                          className="w-16 rounded-lg border border-scholar-200 bg-scholar-50 px-2 py-0.5 text-center text-xs font-bold text-ink outline-none focus:border-scholar-500"
                          value={branchCap}
                          onChange={(e) => handleBranchCapacityChange(b.id, e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Clock size={12} className="absolute left-2.5 top-2 text-scholar-400 pointer-events-none" />
                        <input
                          type="text"
                          className="w-full rounded-lg border border-scholar-200 bg-scholar-50 pl-7 pr-2 py-1 text-xs font-semibold text-ink outline-none focus:border-scholar-500"
                          placeholder="e.g. 08:00 AM - 10:00 AM"
                          value={branchTime}
                          onChange={(e) => handleBranchTimingChange(b.id, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-scholar-200 text-xs">
              <span className="font-bold text-scholar-700">Total Combined Batch Capacity:</span>
              <span className="rounded-lg bg-scholar-600 px-2 py-0.5 text-xs font-black text-white shadow-2xs">
                {totalCapacity} Seats Across {activeBranchList.length} Branches
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch Capacity (Seats) *">
              <div className="relative">
                <Users size={14} className="absolute left-3 top-2.5 text-scholar-400 pointer-events-none" />
                <input
                  type="number"
                  min={1}
                  required
                  className={`${inputClass} pl-9`}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Batch Status">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Active">Active (Ongoing)</option>
                <option value="Upcoming">Upcoming (Admissions Open)</option>
                <option value="Closed">Closed</option>
              </select>
            </Field>
          </div>
        )}

        {activeBranchList.length > 1 && (
          <Field label="Batch Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Active">Active (Admissions Open)</option>
              <option value="Upcoming">Upcoming (Schedule Announced)</option>
              <option value="Closed">Closed (Archived)</option>
            </select>
          </Field>
        )}

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-scholar-100 py-2.5 text-xs font-semibold text-scholar-600 hover:bg-scholar-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-scholar-600 py-2.5 text-xs font-semibold text-white hover:bg-scholar-700 disabled:opacity-60 cursor-pointer shadow-2xs"
          >
            {loading ? "Adding Batch..." : "Add Batch"}
          </button>
        </div>
      </form>
    </Drawer>
  );
}


