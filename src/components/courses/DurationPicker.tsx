"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, Sparkles } from "lucide-react";
import {
  parseCourseDuration,
  formatCourseDuration,
  COMMON_DURATION_PRESETS,
  calculateCourseEndDate,
} from "@/lib/course-duration";
import { formatDate } from "@/lib/utils";

export function DurationPicker({
  value,
  onChange,
  label = "Course Duration",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [years, setYears] = useState(1);
  const [months, setMonths] = useState(0);
  const [days, setDays] = useState(0);

  // Sync internal state when incoming value changes
  useEffect(() => {
    if (value) {
      const parts = parseCourseDuration(value);
      setYears(parts.years);
      setMonths(parts.months);
      setDays(parts.days);

      const isExactPreset = COMMON_DURATION_PRESETS.some((p) => p.value.toLowerCase() === value.toLowerCase());
      if (!isExactPreset && (parts.days > 0 || (parts.years > 0 && parts.months > 0))) {
        setMode("custom");
      }
    }
  }, [value]);

  const handlePresetSelect = (presetVal: string) => {
    setMode("preset");
    const parts = parseCourseDuration(presetVal);
    setYears(parts.years);
    setMonths(parts.months);
    setDays(parts.days);
    onChange(presetVal);
  };

  const handleCustomChange = (y: number, m: number, d: number) => {
    const cleanY = Math.max(0, y);
    const cleanM = Math.max(0, m);
    const cleanD = Math.max(0, d);

    setYears(cleanY);
    setMonths(cleanM);
    setDays(cleanD);

    const formatted = formatCourseDuration({ years: cleanY, months: cleanM, days: cleanD });
    onChange(formatted);
  };

  const sampleEndDate = calculateCourseEndDate(new Date(), value || "1 Year");

  return (
    <div className="space-y-2.5 rounded-xl border border-scholar-200 bg-scholar-50/40 p-3.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
          <Clock size={14} className="text-scholar-600" />
          {label}
        </label>

        {/* Toggle between Quick Presets and Custom Units */}
        <div className="flex rounded-lg bg-white p-0.5 border border-scholar-200 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setMode("preset")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mode === "preset"
                ? "bg-scholar-600 text-white shadow-xs"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            Quick Presets
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mode === "custom"
                ? "bg-scholar-600 text-white shadow-xs"
                : "text-scholar-600 hover:text-scholar-900"
            }`}
          >
            Custom Units (Y/M/D)
          </button>
        </div>
      </div>

      {mode === "preset" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {COMMON_DURATION_PRESETS.map((preset) => {
              const isSelected = value?.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`flex flex-col text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? "border-scholar-600 bg-scholar-600 text-white font-bold shadow-xs"
                      : "border-scholar-200 bg-white text-scholar-800 hover:border-scholar-400 hover:bg-scholar-50"
                  }`}
                >
                  <span className="font-semibold text-[11px] truncate">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-scholar-600 block mb-1">
                Years
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={years}
                onChange={(e) => handleCustomChange(parseInt(e.target.value) || 0, months, days)}
                className="w-full rounded-lg border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-scholar-500 text-center"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-scholar-600 block mb-1">
                Months
              </label>
              <input
                type="number"
                min={0}
                max={24}
                value={months}
                onChange={(e) => handleCustomChange(years, parseInt(e.target.value) || 0, days)}
                className="w-full rounded-lg border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-scholar-500 text-center"
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-scholar-600 block mb-1">
                Days
              </label>
              <input
                type="number"
                min={0}
                max={365}
                value={days}
                onChange={(e) => handleCustomChange(years, months, parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-scholar-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-scholar-500 text-center"
                placeholder="0"
              />
            </div>
          </div>

          {/* Quick combination shortcuts */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-semibold text-scholar-500 self-center">Popular:</span>
            <button
              type="button"
              onClick={() => handleCustomChange(0, 0, 15)}
              className="text-[10px] rounded-md bg-white border border-scholar-200 px-2 py-0.5 font-medium text-scholar-700 hover:bg-scholar-50"
            >
              15 Days
            </button>
            <button
              type="button"
              onClick={() => handleCustomChange(0, 0, 45)}
              className="text-[10px] rounded-md bg-white border border-scholar-200 px-2 py-0.5 font-medium text-scholar-700 hover:bg-scholar-50"
            >
              45 Days
            </button>
            <button
              type="button"
              onClick={() => handleCustomChange(0, 6, 0)}
              className="text-[10px] rounded-md bg-white border border-scholar-200 px-2 py-0.5 font-medium text-scholar-700 hover:bg-scholar-50"
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => handleCustomChange(1, 6, 0)}
              className="text-[10px] rounded-md bg-white border border-scholar-200 px-2 py-0.5 font-bold text-scholar-800 hover:bg-scholar-50"
            >
              1 Year 6 Months
            </button>
            <button
              type="button"
              onClick={() => handleCustomChange(2, 0, 0)}
              className="text-[10px] rounded-md bg-white border border-scholar-200 px-2 py-0.5 font-medium text-scholar-700 hover:bg-scholar-50"
            >
              2 Years
            </button>
          </div>
        </div>
      )}

      {/* Selected duration preview */}
      <div className="flex items-center justify-between rounded-lg bg-white p-2 border border-scholar-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-scholar-100 text-scholar-700 text-[10px] font-bold">
            ✓
          </span>
          <span className="font-bold text-scholar-900">
            {value || "1 Year"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-scholar-500">
          <Calendar size={11} className="text-scholar-400" />
          <span>Finishes: ~{formatDate(sampleEndDate)}</span>
        </div>
      </div>
    </div>
  );
}
