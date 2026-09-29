import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ModernEmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function ModernEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: ModernEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-10 sm:p-14 text-center rounded-2xl border-2 border-dashed border-border/80 bg-card/40 backdrop-blur-xs space-y-4",
        className
      )}
    >
      <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner border border-primary/20">
        <Icon className="size-7 stroke-[1.8]" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
          {actionLabel && onAction && (
            <Button
              size="sm"
              onClick={onAction}
              className="gradient-brand text-white border-0 font-semibold text-xs shadow-xs"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSecondaryAction}
              className="text-xs font-semibold"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
