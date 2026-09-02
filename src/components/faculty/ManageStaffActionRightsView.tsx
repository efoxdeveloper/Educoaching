"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Shield,
  Check,
  AlertCircle,
  Save,
  Search,
  KeyRound,
  Lock,
  Unlock,
  Building,
  UserCheck,
} from "lucide-react";
import { STAFF_PERMISSIONS_CATALOG, type Permission } from "@/lib/permissions";
import type { FacultyRow } from "./FacultyTable";
import { initials } from "@/lib/utils";

export function ManageStaffActionRightsView({
  faculty,
}: {
  faculty: FacultyRow[];
}) {
  const router = useRouter();
  const [selectedStaffId, setSelectedStaffId] = useState<string>(faculty[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [permissionsState, setPermissionsState] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const f of faculty) {
      map[f.id] = f.permissions || [];
    }
    return map;
  });
  const [systemAccessState, setSystemAccessState] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const f of faculty) {
      map[f.id] = Boolean(f.hasSystemAccess);
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredFaculty = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.designation || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.roleType || "").toLowerCase().includes(search.toLowerCase())
  );

  const currentStaff = faculty.find((f) => f.id === selectedStaffId) || faculty[0];
  const currentPermissions = currentStaff ? permissionsState[currentStaff.id] || [] : [];
  const currentSystemAccess = currentStaff ? systemAccessState[currentStaff.id] ?? false : false;

  const togglePermission = (permKey: Permission) => {
    if (!currentStaff) return;
    const existing = permissionsState[currentStaff.id] || [];
    let updated: string[];
    if (existing.includes(permKey)) {
      updated = existing.filter((p) => p !== permKey);
    } else {
      updated = [...existing, permKey];
    }
    setPermissionsState((prev) => ({
      ...prev,
      [currentStaff.id]: updated,
    }));
    setStatusMsg(null);
  };

  const toggleAllCategory = (permissions: { key: Permission }[]) => {
    if (!currentStaff) return;
    const existing = new Set(permissionsState[currentStaff.id] || []);
    const allSelected = permissions.every((p) => existing.has(p.key));

    let updated: string[];
    if (allSelected) {
      // Uncheck all in category
      const removeKeys = new Set(permissions.map((p) => p.key));
      updated = (permissionsState[currentStaff.id] || []).filter((k) => !removeKeys.has(k as Permission));
    } else {
      // Check all in category
      for (const p of permissions) {
        existing.add(p.key);
      }
      updated = Array.from(existing);
    }

    setPermissionsState((prev) => ({
      ...prev,
      [currentStaff.id]: updated,
    }));
    setStatusMsg(null);
  };

  const handleSaveRights = async () => {
    if (!currentStaff) return;
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/faculty/${currentStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: permissionsState[currentStaff.id] || [],
          hasSystemAccess: systemAccessState[currentStaff.id],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update action rights");
      }

      setStatusMsg({ type: "success", text: `Action rights successfully updated for ${currentStaff.name}` });
      router.refresh();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Could not save permissions." });
    } finally {
      setSaving(false);
    }
  };

  if (!faculty || faculty.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Shield size={36} className="mx-auto text-scholar-300 mb-2" />
        <h3 className="text-sm font-bold text-scholar-800">No Staff Members Registered Yet</h3>
        <p className="text-xs text-scholar-500 mt-1">
          Add staff and teachers in the Personnel Directory tab to configure their granular system action rights.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-2 rounded-2xl border border-scholar-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-scholar-900">Manage Staff Action Rights &amp; Access Controls</h2>
          <p className="text-xs text-scholar-500 mt-0.5">
            Configure granular functional permissions for each staff member across Academics, Admissions, CRM, Billing, and Operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="scholar" className="px-3 py-1">
            Strictly Restricted to Owner &amp; Admin
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Staff Selector */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="p-4">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-scholar-400" />
              <input
                type="text"
                placeholder="Search personnel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-scholar-100 bg-paper py-1.5 pl-8 pr-3 text-xs outline-none focus:border-scholar-400"
              />
            </div>

            <div className="max-h-[580px] space-y-1 overflow-y-auto pr-1">
              {filteredFaculty.map((f) => {
                const isSelected = f.id === selectedStaffId;
                const permCount = (permissionsState[f.id] || []).length;
                const hasLogin = systemAccessState[f.id];

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(f.id);
                      setStatusMsg(null);
                    }}
                    className={`w-full text-left rounded-xl p-2.5 transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-scholar-600 text-white shadow-xs"
                        : "hover:bg-scholar-50 text-scholar-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isSelected
                            ? "bg-white text-scholar-800"
                            : "bg-scholar-100 text-scholar-700"
                        }`}
                      >
                        {initials(f.name)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate leading-tight">{f.name}</p>
                        <p className={`text-[11px] truncate ${isSelected ? "text-white/80" : "text-scholar-500"}`}>
                          {f.roleType || "Staff"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {hasLogin ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          Login Active
                        </span>
                      ) : (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            isSelected ? "bg-white/20 text-white" : "bg-scholar-100 text-scholar-500"
                          }`}
                        >
                          No Login
                        </span>
                      )}
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isSelected ? "bg-white/30 text-white" : "bg-scholar-100 text-scholar-700"
                        }`}
                      >
                        {permCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Permission Matrix for Selected Staff */}
        <div className="lg:col-span-8 space-y-4">
          {currentStaff && (
            <Card className="p-6">
              {/* Personnel Banner */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-scholar-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-scholar-100 text-scholar-700 text-sm font-bold shadow-xs">
                    {initials(currentStaff.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-scholar-900">{currentStaff.name}</h3>
                      <span className="rounded-md bg-scholar-50 px-2 py-0.5 text-xs font-semibold text-scholar-700 border border-scholar-200">
                        {currentStaff.roleType || "FACULTY"}
                      </span>
                    </div>
                    <p className="text-xs text-scholar-500 mt-0.5">
                      {currentStaff.email || "No email assigned"} • {currentStaff.mobile || "No phone"} • Department:{" "}
                      <span className="font-semibold text-scholar-700">{currentStaff.department || "ACADEMIC"}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveRights}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-4 py-2 text-xs font-bold text-white hover:bg-scholar-700 disabled:opacity-60 transition-colors shadow-xs"
                >
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Action Rights"}
                </button>
              </div>

              {/* Status Alert */}
              {statusMsg && (
                <div
                  className={`mt-4 rounded-xl p-3 text-xs font-medium flex items-center gap-2 ${
                    statusMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {statusMsg.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* System Software Access Switch */}
              <div className="mt-5 rounded-2xl border border-scholar-200 bg-scholar-50/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white p-2 text-scholar-700 shadow-xs border border-scholar-200">
                      <KeyRound size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-scholar-900">Institute Software Portal Login</h4>
                      <p className="text-[11px] text-scholar-500">
                        Allow this staff member to authenticate into the system dashboard with their registered credentials.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSystemAccess}
                      onChange={(e) => {
                        setSystemAccessState((prev) => ({
                          ...prev,
                          [currentStaff.id]: e.target.checked,
                        }));
                        setStatusMsg(null);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-scholar-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-scholar-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-scholar-600"></div>
                  </label>
                </div>
              </div>

              {/* Permission Categories */}
              <div className="mt-6 space-y-6">
                {STAFF_PERMISSIONS_CATALOG.map((group) => {
                  const allInGroupSelected = group.permissions.every((p) =>
                    currentPermissions.includes(p.key)
                  );

                  return (
                    <div key={group.category} className="rounded-2xl border border-scholar-100 p-4 bg-white">
                      <div className="flex items-center justify-between border-b border-scholar-100 pb-2.5 mb-3">
                        <div>
                          <h4 className="text-xs font-bold text-scholar-900 tracking-wide uppercase">
                            {group.category}
                          </h4>
                          <span className="text-[11px] text-scholar-400">
                            {group.permissions.filter((p) => currentPermissions.includes(p.key)).length} of{" "}
                            {group.permissions.length} rights enabled
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleAllCategory(group.permissions)}
                          className="text-[11px] font-semibold text-scholar-600 hover:text-scholar-800"
                        >
                          {allInGroupSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.permissions.map((perm) => {
                          const isChecked = currentPermissions.includes(perm.key);

                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all ${
                                isChecked
                                  ? "border-scholar-400 bg-scholar-50/50 shadow-xs"
                                  : "border-scholar-100 bg-paper/60 hover:bg-paper"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(perm.key)}
                                className="mt-0.5 h-4 w-4 rounded text-scholar-600 focus:ring-scholar-500 border-scholar-300"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-scholar-800 leading-tight">
                                  {perm.label}
                                </p>
                                <p className="text-[11px] text-scholar-500 mt-0.5 leading-snug">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save Bar */}
              <div className="mt-6 pt-4 border-t border-scholar-100 flex items-center justify-between">
                <span className="text-xs text-scholar-500">
                  Total Permissions Enabled: <strong className="text-scholar-800">{currentPermissions.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSaveRights}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-scholar-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-scholar-700 disabled:opacity-60 transition-colors shadow-xs"
                >
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Action Rights"}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
