import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DetailSlideDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function DetailSlideDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = "max-w-xl",
}: DetailSlideDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Frosted Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-in Sheet Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={cn(
              "relative z-10 w-full h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between overflow-hidden",
              width
            )}
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-start justify-between gap-4 bg-muted/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground font-heading">{title}</h2>
                  {badge}
                </div>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="size-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">{children}</div>

            {/* Footer Actions */}
            {footer && (
              <div className="p-4 border-t border-border bg-card/90 backdrop-blur flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
