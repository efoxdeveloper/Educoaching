"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar } from "lucide-react";
import {
  parseCourseDuration,
  formatCourseDuration,
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
    }
  }, [value]);

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
        <label className="text-xs font-bold uppercase tracking-wider text-scholar-800 flex items-center gap-1.5">
          <Clock size={14} className="text-scholar-600" />
          {label}
        </label>
        <span className="text-[11px] text-scholar-500 font-medium">Custom (Years / Months / Days)</span>
      </div>

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
      </div>

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
