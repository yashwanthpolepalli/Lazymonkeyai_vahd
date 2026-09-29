import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle, CircleDot } from "lucide-react";

export interface TimelineNode {
  id: string;
  label: string;
  location?: string;
  time?: string;
  status: "completed" | "active" | "pending" | "delayed";
}

export interface RouteProgressTimelineProps {
  nodes: TimelineNode[];
  className?: string;
}

export function RouteProgressTimeline({ nodes, className }: RouteProgressTimelineProps) {
  const activeIndex = nodes.findIndex((n) => n.status === "active");
  const completedCount = nodes.filter((n) => n.status === "completed").length;
  const progressPercent = nodes.length > 1 ? (completedCount / (nodes.length - 1)) * 100 : 0;

  return (
    <div className={cn("w-full space-y-4 rounded-2xl border bg-card p-5 shadow-xs", className)}>
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b border-border/50">
        <span>Route & Shipment Progression</span>
        <span className="text-primary font-bold">{Math.round(progressPercent)}% Completed</span>
      </div>

      <div className="relative pt-2 pb-1">
        {/* Connecting Progress Track */}
        <div className="absolute top-6 left-6 right-6 h-1 bg-muted rounded-full -translate-y-1/2 z-0">
          <div
            className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        {/* Milestone Steps */}
        <div className="relative z-10 flex items-start justify-between">
          {nodes.map((node, idx) => {
            const isCompleted = node.status === "completed";
            const isActive = node.status === "active";
            const isDelayed = node.status === "delayed";

            return (
              <div key={node.id} className="flex flex-col items-center text-center max-w-[120px]">
                {/* Node Circle */}
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm bg-card",
                    isCompleted && "bg-primary text-primary-foreground border-primary",
                    isActive && "border-primary bg-primary/10 text-primary ring-4 ring-primary/20 scale-110",
                    isDelayed && "border-rose-500 bg-rose-500/10 text-rose-600 ring-4 ring-rose-500/20",
                    node.status === "pending" && "border-muted-foreground/30 text-muted-foreground/50 bg-card"
                  )}
                >
                  {isCompleted && <Check className="size-4 stroke-[2.5]" />}
                  {isActive && <CircleDot className="size-4 animate-pulse stroke-[2.5]" />}
                  {isDelayed && <AlertCircle className="size-4 stroke-[2.5]" />}
                  {node.status === "pending" && <span className="text-[11px] font-bold">{idx + 1}</span>}
                </div>

                {/* Node Labels */}
                <div className="mt-2.5 space-y-0.5">
                  <div
                    className={cn(
                      "text-xs font-bold leading-snug",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                  >
                    {node.label}
                  </div>
                  {node.location && (
                    <div className="text-[11px] text-muted-foreground font-medium truncate max-w-[110px]">
                      {node.location}
                    </div>
                  )}
                  {node.time && (
                    <div className="text-[10px] text-muted-foreground/80 font-mono flex items-center justify-center gap-0.5">
                      <Clock className="size-2.5" /> {node.time}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
