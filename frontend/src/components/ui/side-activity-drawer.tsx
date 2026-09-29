import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Clock, CheckCircle2, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  user: string;
  avatar?: string;
  message: string;
  time: string;
  type?: "status" | "comment" | "alert";
}

export interface SideActivityDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  initialActivities?: ActivityItem[];
  onSendMessage?: (text: string) => void;
}

export function SideActivityDrawer({
  open,
  onClose,
  title = "Dispatch & Activity Feed",
  initialActivities = [
    {
      id: "1",
      user: "System Dispatcher",
      message: "Driver John assigned to route LD-9021. GPS telemetry active.",
      time: "10 mins ago",
      type: "status",
    },
    {
      id: "2",
      user: "Alex Rivera",
      message: "Trailer inspection passed at Central Depot. Departure scheduled.",
      time: "25 mins ago",
      type: "comment",
    },
    {
      id: "3",
      user: "IoT Alert",
      message: "Temperature sensor within normal range (4.2°C).",
      time: "1 hour ago",
      type: "status",
    },
  ],
  onSendMessage,
}: SideActivityDrawerProps) {
  const [messages, setMessages] = useState<ActivityItem[]>(initialActivities);
  const [inputVal, setInputVal] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsg: ActivityItem = {
      id: Date.now().toString(),
      user: "You",
      message: inputVal.trim(),
      time: "Just now",
      type: "comment",
    };

    setMessages((prev) => [newMsg, ...prev]);
    onSendMessage?.(inputVal.trim());
    setInputVal("");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col justify-between"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare className="size-4" />
                </div>
                <h3 className="font-bold text-sm font-heading">{title}</h3>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="size-8 p-0 rounded-xl hover:bg-muted"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Activities List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((act) => (
                <div
                  key={act.id}
                  className={cn(
                    "p-3 rounded-xl border text-xs space-y-1.5 transition-all",
                    act.type === "alert"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                      : "bg-muted/40 border-border/60 text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <User className="size-3 text-primary" /> {act.user}
                    </span>
                    <span className="font-mono text-[10px] flex items-center gap-0.5">
                      <Clock className="size-2.5" /> {act.time}
                    </span>
                  </div>
                  <p className="leading-relaxed text-xs">{act.message}</p>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3.5 border-t border-border bg-card flex gap-2">
              <Input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Type dispatch note or message..."
                className="text-xs h-9"
              />
              <Button type="submit" size="sm" className="h-9 px-3 gradient-brand text-white border-0 shrink-0">
                <Send className="size-3.5" />
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
