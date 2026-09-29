import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
}

export interface SegmentedPillControlProps {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SegmentedPillControl({
  items,
  value,
  onChange,
  className,
  size = "md",
}: SegmentedPillControlProps) {
  const sizeClasses = {
    sm: "p-0.5 text-xs",
    md: "p-1 text-xs",
    lg: "p-1.5 text-sm",
  };

  const itemSizeClasses = {
    sm: "px-2.5 py-1",
    md: "px-3.5 py-1.5",
    lg: "px-4 py-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/40 backdrop-blur-sm select-none",
        sizeClasses[size],
        className
      )}
    >
      {items.map((item) => {
        const isSelected = item.id === value;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 font-bold transition-colors duration-150 rounded-lg shrink-0",
              itemSizeClasses[size],
              isSelected
                ? "text-primary-foreground font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-active-pill"
                className="absolute inset-0 bg-primary rounded-lg shadow-xs z-[-1]"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}

            {Icon && <Icon className="size-3.5" />}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
