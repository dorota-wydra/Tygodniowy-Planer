import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WeekReflection, Workout } from "../types/workout";
import { CheckCircle2, XCircle, MinusCircle, Clock, MapPin, Flag } from "lucide-react";

// ─── Stat helpers ─────────────────────────────────────────────────────────────

function parseDurationMinutes(s?: string): number | null {
  if (!s) return null;
  const c = s.trim().toLowerCase();
  const colon = c.match(/^(\d+):(\d{2})$/);
  if (colon) return parseInt(colon[1]) * 60 + parseInt(colon[2]);
  const hm = c.match(/(\d+)\s*h\s*(\d*)/);
  if (hm) return parseInt(hm[1]) * 60 + (hm[2] ? parseInt(hm[2]) : 0);
  const num = c.match(/^(\d+(?:\.\d+)?)/);
  if (num) { const v = parseFloat(num[1]); if (v > 0 && v <= 600) return Math.round(v); }
  return null;
}

function parseDistanceKm(s?: string): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(",", "."));
  return v > 0 && v <= 300 ? v : null;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function computeWeekStats(workouts: Workout[]) {
  const completed = workouts.filter((w) => w.completed && !w.skipped).length;
  const missed    = workouts.filter((w) => w.missed && !w.skipped && !w.completed).length;
  const skipped   = workouts.filter((w) => w.skipped).length;

  let totalMinutes = 0;
  let totalDistanceKm = 0;
  let hasMinutes  = false;
  let hasDistance = false;

  for (const w of workouts) {
    if (!w.completed) continue;
    const m = parseDurationMinutes(w.duration);
    if (m !== null) { totalMinutes += m; hasMinutes = true; }
    const d = parseDistanceKm(w.distance);
    if (d !== null) { totalDistanceKm += d; hasDistance = true; }
  }

  return {
    completed, missed, skipped,
    totalMinutes: hasMinutes ? totalMinutes : null,
    totalDistanceKm: hasDistance ? totalDistanceKm : null,
  };
}

// ─── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS: { key: keyof WeekReflection; label: string; placeholder: string; icon: string }[] = [
  { key: "q1", label: "Z czego jestem zadowolona w tym tygodniu?",    placeholder: "Np. regularność, nowy rekord, dobre samopoczucie...", icon: "🌟" },
  { key: "q2", label: "Co było dla mnie trudne?",                     placeholder: "Np. zmęczenie, brak motywacji, ból...",               icon: "💭" },
  { key: "q3", label: "Na czym chcę się skupić w przyszłym tygodniu?", placeholder: "Np. więcej rozciągania, wcześniejsze treningi...",   icon: "🎯" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface EndOfWeekModalProps {
  isOpen: boolean;
  /** Called when user cancels at step 1 (no archive happens). */
  onClose: () => void;
  /** Called when user clicks "Przypomnij jutro" at step 1 (no archive happens). */
  onDismiss: () => void;
  /**
   * Called immediately when user confirms save at step 1.
   * Parent should archive the week right here (save to history + clear workouts).
   * After this, if hasProgram the modal moves to step 2; otherwise it closes.
   */
  onArchive: (reflection: WeekReflection) => void;
  /**
   * Called when user decides whether to load from plan (step 2 or immediate close when no program).
   * load=true → parent loads plan workouts.
   * load=false → parent does nothing extra (week already archived).
   * Also called with false when user closes the dialog at step 2 via X/ESC.
   */
  onLoadFromPlan: (load: boolean) => void;
  workouts: Workout[];
  hasProgram: boolean;
  existingReflection?: WeekReflection | null;
}

type Step = "review" | "load-plan";

// ─── Component ────────────────────────────────────────────────────────────────

export function EndOfWeekModal({
  isOpen, onClose, onDismiss, onArchive, onLoadFromPlan,
  workouts, hasProgram, existingReflection,
}: EndOfWeekModalProps) {
  const [step, setStep]       = useState<Step>("review");
  const [answers, setAnswers] = useState<WeekReflection>(
    existingReflection ?? { q1: "", q2: "", q3: "" },
  );

  const stats = computeWeekStats(workouts);

  // Called when user clicks "Zapisz i zacznij nowy tydzień"
  const handleSave = () => {
    // Archive happens immediately, before any plan-load decision
    onArchive(answers);
    if (hasProgram) {
      setStep("load-plan");
    } else {
      // No program → nothing more to decide; signal no plan load and close
      onLoadFromPlan(false);
      resetState();
    }
  };

  const handleLoadPlan = (load: boolean) => {
    onLoadFromPlan(load);
    resetState();
  };

  const resetState = () => {
    setStep("review");
    setAnswers(existingReflection ?? { q1: "", q2: "", q3: "" });
  };

  // onOpenChange handler: behaviour differs by step
  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (step === "review") {
      // User cancelled before archiving — just close, no side effects
      resetState();
      onClose();
    } else {
      // step === "load-plan": archive already happened — treat close as "no load"
      onLoadFromPlan(false);
      resetState();
    }
  };

  const handleDismiss = () => {
    resetState();
    onDismiss();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">

        {/* ── Step 1: review ── */}
        {step === "review" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Flag className="text-white" size={20} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Podsumowanie tygodnia</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    Zapisz refleksję i zarchiwizuj tydzień.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Stats */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statystyki</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                  <CheckCircle2 className="mx-auto mb-1 text-green-500" size={18} />
                  <p className="text-2xl font-bold text-gray-900 leading-none">{stats.completed}</p>
                  <p className="text-xs text-gray-400 mt-1">wykonanych</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                  <XCircle className="mx-auto mb-1 text-red-400" size={18} />
                  <p className="text-2xl font-bold text-gray-900 leading-none">{stats.missed}</p>
                  <p className="text-xs text-gray-400 mt-1">niewykonanych</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
                  <MinusCircle className="mx-auto mb-1 text-gray-300" size={18} />
                  <p className="text-2xl font-bold text-gray-900 leading-none">{stats.skipped}</p>
                  <p className="text-xs text-gray-400 mt-1">pominiętych</p>
                </div>
              </div>
              {(stats.totalMinutes !== null || stats.totalDistanceKm !== null) && (
                <div className="flex gap-4 pt-1">
                  {stats.totalMinutes !== null && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock size={13} className="text-primary shrink-0" />
                      <span className="font-semibold text-gray-800">{formatMinutes(stats.totalMinutes)}</span>
                      <span className="text-xs text-gray-400">łącznie</span>
                    </div>
                  )}
                  {stats.totalDistanceKm !== null && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin size={13} className="text-primary shrink-0" />
                      <span className="font-semibold text-gray-800">{stats.totalDistanceKm.toFixed(1)} km</span>
                      <span className="text-xs text-gray-400">łącznie</span>
                    </div>
                  )}
                </div>
              )}
              {stats.completed + stats.missed + stats.skipped === 0 && (
                <p className="text-xs text-gray-400 text-center py-1">Brak treningów w tym tygodniu.</p>
              )}
            </div>

            {/* Reflection questions */}
            <div className="space-y-4 py-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Refleksja</p>
              {QUESTIONS.map((q) => (
                <div key={q.key} className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span>{q.icon}</span>
                    {q.label}
                  </Label>
                  <Textarea
                    value={answers[q.key]}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                    placeholder={q.placeholder}
                    className="resize-none h-20 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                  />
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 pt-2 flex-col-reverse sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="text-gray-400 text-xs sm:mr-auto"
              >
                Przypomnij jutro
              </Button>
              <Button variant="outline" onClick={() => { resetState(); onClose(); }} className="text-gray-600">
                Anuluj
              </Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 font-semibold">
                Zapisz i zacznij nowy tydzień
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: load-plan ── */}
        {step === "load-plan" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="text-3xl">🎉</div>
                <div>
                  <DialogTitle className="text-xl font-bold">Tydzień zamknięty!</DialogTitle>
                  <DialogDescription className="mt-0.5">
                    Poprzedni tydzień trafił do historii.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-700 font-medium">
                Chcesz załadować treningi z programu na nowy tydzień?
              </p>
              <p className="text-xs text-gray-400">
                Treningi z aktywnego cyklu zostaną dodane do bieżącego tygodnia.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleLoadPlan(false)} className="text-gray-600">
                Pomiń
              </Button>
              <Button onClick={() => handleLoadPlan(true)} className="bg-primary hover:bg-primary/90 font-semibold">
                Załaduj z programu
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
