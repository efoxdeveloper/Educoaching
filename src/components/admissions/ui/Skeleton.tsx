"use client";

/**
 * 21st.dev-inspired Skeleton loaders — for table and cards
 * Registry: https://21st.dev/r/skeleton
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-scholar-100", className)} />;
}

export function LeadRowSkeleton() {
  return (
    <tr className="border-b border-scholar-50">
      <td className="px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
      </td>
      <td className="px-3.5 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-1 h-2 w-16" />
      </td>
      <td className="px-3.5 py-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-1 h-2 w-16" />
      </td>
      <td className="px-3.5 py-3">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      <td className="px-3.5 py-3">
        <Skeleton className="h-6 w-20 rounded-lg" />
      </td>
      <td className="px-3.5 py-3">
        <Skeleton className="h-5 w-24 rounded-full" />
      </td>
      <td className="px-3.5 py-3">
        <div className="flex justify-end gap-1.5">
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-6 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

export function LeadCardSkeleton() {
  return (
    <div className="rounded-xl border border-scholar-100 bg-white p-3 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
      <Skeleton className="h-8 rounded-lg" />
    </div>
  );
}

export function LeadTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full">
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <LeadRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-3 p-3">
        {Array.from({ length: rows }).map((_, i) => (
          <LeadCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
