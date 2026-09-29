import React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/80", className)} {...props} />;
}

export function SkeletonCard({ className }: { className?: string } = {}) {
  return (
    <div className={cn("p-5 rounded-2xl bg-white border border-slate-100 shadow-xs space-y-3 animate-pulse", className)}>
      <div className="h-4 bg-slate-200/80 rounded-md w-1/3" />
      <div className="h-8 bg-slate-200/80 rounded-md w-2/3" />
      <div className="h-3 bg-slate-200/80 rounded-md w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string } = {}) {
  return (
    <div className={cn("w-full bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-3 animate-pulse", className)}>
      <div className="h-8 bg-slate-200/80 rounded-xl w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-xl w-full flex items-center gap-3 px-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-200/60 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton({ className }: { className?: string } = {}) {
  return (
    <div className={cn("space-y-6 animate-pulse", className)}>
      <div className="h-20 bg-slate-200/80 rounded-2xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="h-28 bg-slate-200/80 rounded-2xl" />
        <div className="h-28 bg-slate-200/80 rounded-2xl" />
        <div className="h-28 bg-slate-200/80 rounded-2xl" />
        <div className="h-28 bg-slate-200/80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-64 bg-slate-200/80 rounded-2xl lg:col-span-2" />
        <div className="h-64 bg-slate-200/80 rounded-2xl" />
      </div>
    </div>
  );
}

export { Skeleton };
export default Skeleton;
