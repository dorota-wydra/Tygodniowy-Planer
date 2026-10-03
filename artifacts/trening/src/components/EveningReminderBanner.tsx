import { Workout } from "../types/workout";
import { TYPE_CONFIG } from "./WorkoutCard";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, MinusCircle, Clock, X, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EveningReminderBannerProps {
  workouts: Workout[];
  onMarkDone: (id: string) => void;
  onMoveTomorrow: (id: string) => void;
  onSkip: (id: string) => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

const SUPPORTIVE = [
  "Nie wszystko musi być idealne. Zrób tyle, ile możesz.",
  "Plan można dopasować — liczy się regularność, nie perfekcja.",
  "Mały ruch to też ruch. Co robimy z tymi treningami?",
];

export function EveningReminderBanner({
  workouts,
  onMarkDone,
  onMoveTomorrow,
  onSkip,
  onSnooze,
  onDismiss,
}: EveningReminderBannerProps) {
  const msg = SUPPORTIVE[Math.floor(Date.now() / 86_400_000) % SUPPORTIVE.length];

  return (
    <AnimatePresence>
      {workouts.length > 0 && (
        <motion.div
          key="evening-banner"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 bg-amber-50 border-b border-amber-100">
            <div className="flex items-start gap-2">
              <Moon size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Nieukończone treningi</p>
                <p className="text-xs text-amber-700 mt-0.5">{msg}</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-amber-400 hover:text-amber-700 transition-colors shrink-0 p-0.5"
              aria-label="Zamknij"
            >
              <X size={16} />
            </button>
          </div>

          {/* Workout list */}
          <div className="divide-y divide-gray-50">
            {workouts.map((w) => {
              const cfg = TYPE_CONFIG[w.type] ?? TYPE_CONFIG["inne"];
              return (
                <div key={w.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`w-2 h-2 rounded-full ${cfg.borderCls.replace("border-l-", "bg-")}`} />
                    <span className="flex-1 min-w-0 text-sm font-semibold text-gray-800 truncate">{w.name}</span>
                    {w.plannedTime && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <Clock size={10} />{w.plannedTime}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onMarkDone(w.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <CheckCircle size={12} /> Wykonany
                    </button>
                    <button
                      onClick={() => onMoveTomorrow(w.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <ArrowRight size={12} /> Przenieś na jutro
                    </button>
                    <button
                      onClick={() => onSkip(w.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <MinusCircle size={12} /> Pomiń
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60">
            <button
              onClick={onSnooze}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Clock size={12} /> Przypomnij za 60 min
            </button>
            <Button size="sm" variant="ghost" onClick={onDismiss} className="text-xs h-7 text-gray-400">
              Zamknij
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
