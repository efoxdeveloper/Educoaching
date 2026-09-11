"use client";

/**
 * 21st.dev-inspired Tooltip — simple hover tooltip with plain-language help
 * Registry: https://21st.dev/r/tooltip
 */
import { useState } from "react";

export function GuidedTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-scholar-200 bg-scholar-800 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg">
          {content}
          <span className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-scholar-800 bg-scholar-800" />
        </span>
      )}
    </span>
  );
}
