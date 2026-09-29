import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface KpiStatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  period?: string;
  icon: React.ElementType;
  iconTheme?: "purple" | "emerald" | "blue" | "amber" | "rose" | "cyan";
  sparklineData?: number[];
  className?: string;
  onClick?: () => void;
}

const themeStyles = {
  purple: {
    bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    stroke: "#8442ff",
    fill: "rgba(132, 66, 255, 0.12)",
  },
  emerald: {
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    stroke: "#10b981",
    fill: "rgba(16, 185, 129, 0.12)",
  },
  blue: {
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    stroke: "#3b82f6",
    fill: "rgba(59, 130, 246, 0.12)",
  },
  amber: {
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    stroke: "#f59e0b",
    fill: "rgba(245, 158, 11, 0.12)",
  },
  rose: {
    bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    stroke: "#ef4444",
    fill: "rgba(239, 68, 68, 0.12)",
  },
  cyan: {
    bg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    stroke: "#06b6d4",
    fill: "rgba(6, 182, 212, 0.12)",
  },
};

export function KpiStatCard({
  title,
  value,
  change,
  trend = "up",
  period = "vs last month",
  icon: Icon,
  iconTheme = "purple",
  sparklineData = [12, 19, 14, 25, 22, 30, 28, 38],
  className,
  onClick,
}: KpiStatCardProps) {
  const theme = themeStyles[iconTheme] || themeStyles.purple;

  // Generate SVG path for mini sparkline
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 100;
  const height = 28;

  const points = sparklineData.map((d, i) => {
    const x = (i / (sparklineData.length - 1)) * width;
    const y = height - ((d - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 text-card-foreground shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/40",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
            {value}
          </div>
        </div>

        <div
          className={cn(
            "size-10 rounded-2xl flex items-center justify-center border shadow-2xs transition-transform duration-200 group-hover:scale-105 shrink-0",
            theme.bg
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-border/40">
        {change ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border",
                trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                trend === "down" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                trend === "neutral" && "bg-muted text-muted-foreground border-border"
              )}
            >
              {trend === "up" && <TrendingUp className="size-3" />}
              {trend === "down" && <TrendingDown className="size-3" />}
              {trend === "neutral" && <Minus className="size-3" />}
              {change}
            </span>
            {period && <span className="text-[11px] text-muted-foreground">{period}</span>}
          </div>
        ) : (
          <div />
        )}

        {/* Embedded Sparkline Graphic */}
        <div className="w-20 h-7 shrink-0 opacity-80 hover:opacity-100 transition-opacity">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <path d={areaD} fill={theme.fill} />
            <path
              d={pathD}
              fill="none"
              stroke={theme.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
