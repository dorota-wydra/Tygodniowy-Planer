import { useState, useRef, useEffect } from "react";
import {
  TrainingProgram, ProgramCycle, ProgramWeek, PlannedWorkout,
  CYCLE_COLORS, CYCLE_COLOR_KEYS, CycleColorKey,
  createDefaultProgram, createEmptyWeek, createEmptyCycle,
  getCurrentGlobalWeekIndex, getWeekByGlobalIndex, getAllWeeksFlat,
  formatWeekDateRange, getProgramTotalWeeks, getProgramStartDate,
} from "../types/program";
import { WorkoutType, IntensityLevel, DAYS_OF_WEEK, DayOfWeek, INTENSITY_CONFIG } from "../types/workout";
import { TYPE_CONFIG } from "../components/WorkoutCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp, Settings, Eye, CalendarDays, X, Target } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<WorkoutType, string> = {
  bieg: "Bieg", bieg_latwy: "Bieg łatwy", bieg_dlugi: "Bieg długi", bieg_jakosciowy: "Bieg jakościowy",
  siła: "Siła", joga: "Joga", rozciaganie: "Rozciąganie", mobility: "Mobility",
  joga_rozciaganie: "Joga / Rozciąganie",
  zabawa_biegowa: "Zabawa biegowa", rower: "Rower", spacer: "Spacer",
  relaksacja: "Relaksacja", inne: "Inne",
};

const INTENSITY_OPTIONS: { value: IntensityLevel; label: string }[] = [
  { value: "lekki", label: "Lekki" }, { value: "umiarkowany", label: "Umiarkowany" },
  { value: "ciężki", label: "Ciężki" }, { value: "regeneracja", label: "Regeneracja" },
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ─── WorkoutFormDialog ────────────────────────────────────────────────────────

type WForm = {
  day: DayOfWeek; type: WorkoutType; name: string; description: string;
  intensity: IntensityLevel | ""; distance: string; duration: string;
  reps: string; pace: string; heartRate: string; weight: string; customNotes: string;
};

const EMPTY_WFORM: WForm = {
  day: "Poniedziałek", type: "bieg", name: "", description: "",
  intensity: "", distance: "", duration: "", reps: "", pace: "", heartRate: "", weight: "", customNotes: "",
};

function WorkoutFormDialog({
  open, initial, defaultDay, onSave, onClose,
}: {
  open: boolean;
  initial?: PlannedWorkout | null;
  defaultDay?: DayOfWeek;
  onSave: (w: Omit<PlannedWorkout, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<WForm>(EMPTY_WFORM);
  const [showParams, setShowParams] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          day: initial.day, type: initial.type, name: initial.name,
          description: initial.description ?? "", intensity: initial.intensity ?? "",
          distance: initial.distance ?? "", duration: initial.duration ?? "",
          reps: initial.reps ?? "", pace: initial.pace ?? "",
          heartRate: initial.heartRate ?? "", weight: initial.weight ?? "",
          customNotes: initial.customNotes ?? "",
        });
        setShowParams(!!(initial.distance || initial.duration || initial.reps || initial.pace || initial.heartRate || initial.weight));
      } else {
        setForm({ ...EMPTY_WFORM, day: defaultDay ?? "Poniedziałek" });
        setShowParams(false);
      }
    }
  }, [open, initial, defaultDay]);

  const set = (k: keyof WForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({
      day: form.day, type: form.type, name: form.name.trim(),
      description: form.description || undefined, intensity: (form.intensity as IntensityLevel) || undefined,
      distance: form.distance || undefined, duration: form.duration || undefined,
      reps: form.reps || undefined, pace: form.pace || undefined,
      heartRate: form.heartRate || undefined, weight: form.weight || undefined,
      customNotes: form.customNotes || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edytuj trening" : "Dodaj trening"}</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Dzień</Label>
              <Select value={form.day} onValueChange={v => set("day", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS_OF_WEEK.map(d => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Typ</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TYPE_LABELS).filter(([v]) => v !== "joga_rozciaganie").map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nazwa</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="np. Bieg interwałowy" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Opis (opcjonalnie)</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Krótki opis..." className="resize-none h-16 text-xs" />
          </div>
          <button type="button" onClick={() => setShowParams(p => !p)} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
            {showParams ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Parametry szczegółowe
          </button>
          {showParams && (
            <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Intensywność</Label>
                <Select value={form.intensity} onValueChange={v => set("intensity", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Brak" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-xs">Brak</SelectItem>
                    {INTENSITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {[
                { key: "distance", label: "Dystans", placeholder: "np. 5 km" },
                { key: "duration", label: "Czas", placeholder: "np. 45 min" },
                { key: "reps", label: "Powtórzenia", placeholder: "np. 3×10" },
                { key: "pace", label: "Tempo", placeholder: "np. 5:30/km" },
                { key: "heartRate", label: "Tętno", placeholder: "np. 140 bpm" },
                { key: "weight", label: "Ciężar", placeholder: "np. 60 kg" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input value={form[key as keyof WForm] as string} onChange={e => set(key as keyof WForm, e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
                </div>
              ))}
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Uwagi własne</Label>
                <Input value={form.customNotes} onChange={e => set("customNotes", e.target.value)} placeholder="Dowolna notatka..." className="h-8 text-xs" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Anuluj</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.name.trim()} className="bg-primary hover:bg-primary/90">
            {initial ? "Zapisz" : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PlannedWorkoutCard ───────────────────────────────────────────────────────

function PlannedWorkoutCard({ w, onEdit, onDelete }: { w: PlannedWorkout; onEdit?: () => void; onDelete?: () => void }) {
  const cfg = TYPE_CONFIG[w.type] ?? TYPE_CONFIG["inne"];
  const metrics = [w.distance, w.duration, w.reps, w.pace, w.heartRate, w.weight].filter(Boolean) as string[];
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${cfg.badgeCls}`}>{cfg.label}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800">{w.name}</p>
        {(w.intensity || metrics.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {w.intensity && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${INTENSITY_CONFIG[w.intensity].badgeCls}`}>
                {INTENSITY_CONFIG[w.intensity].label}
              </span>
            )}
            {metrics.map((v, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{v}</span>
            ))}
          </div>
        )}
        {w.description && <p className="text-[10px] text-gray-500 mt-0.5 italic leading-snug">{w.description}</p>}
        {w.customNotes && <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{w.customNotes}</p>}
      </div>
      {(onEdit || onDelete) && (
        <div className="flex gap-0.5 shrink-0">
          {onEdit && <button onClick={onEdit} className="p-1 rounded text-gray-300 hover:text-primary hover:bg-primary/10"><Pencil size={11} /></button>}
          {onDelete && <button onClick={onDelete} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 size={11} /></button>}
        </div>
      )}
    </div>
  );
}

// ─── WeekTemplateEditor ───────────────────────────────────────────────────────

function WeekTemplateEditor({
  week, allWeeks, globalWeekNumber,
  onUpdate, onClose, onApplyToAllInCycle, onApplyToAll, cycleWeekCount, totalWeekCount,
}: {
  week: ProgramWeek;
  allWeeks: { globalIndex: number; week: ProgramWeek; cycle: { name: string } }[];
  globalWeekNumber: number;
  onUpdate: (w: ProgramWeek) => void;
  onClose: () => void;
  onApplyToAllInCycle: (workouts: PlannedWorkout[]) => void;
  onApplyToAll: (workouts: PlannedWorkout[]) => void;
  cycleWeekCount: number;
  totalWeekCount: number;
}) {
  const [addingDay, setAddingDay] = useState<DayOfWeek | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<PlannedWorkout | null>(null);
  const [copyFrom, setCopyFrom] = useState<string>("");
  const [showCopy, setShowCopy] = useState(false);
  const [pendingApply, setPendingApply] = useState<"cycle" | "program" | null>(null);

  const addWorkout = (data: Omit<PlannedWorkout, "id">) => {
    onUpdate({ ...week, workouts: [...week.workouts, { ...data, id: uid() }] });
  };
  const updateWorkout = (id: string, data: Omit<PlannedWorkout, "id">) => {
    onUpdate({ ...week, workouts: week.workouts.map(w => w.id === id ? { ...data, id } : w) });
  };
  const deleteWorkout = (id: string) => {
    onUpdate({ ...week, workouts: week.workouts.filter(w => w.id !== id) });
  };
  const handleCopyFrom = () => {
    const src = allWeeks.find(aw => aw.week.id === copyFrom);
    if (!src) return;
    onUpdate({ ...week, workouts: src.week.workouts.map(w => ({ ...w, id: uid() })) });
    setShowCopy(false);
    setCopyFrom("");
  };

  return (
    <div className="border-t border-primary/20 bg-primary/5 rounded-b-xl p-3 space-y-3">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <p className="text-xs font-bold text-primary shrink-0">Szablon · Tydzień {globalWeekNumber}</p>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setShowCopy(v => !v)} className="text-[10px] text-gray-400 hover:text-primary flex items-center gap-0.5 px-2 py-1 rounded hover:bg-primary/10">
            <Copy size={10} /> Kopiuj z...
          </button>
          <button
            onClick={() => { setShowCopy(false); setPendingApply("cycle"); }}
            disabled={week.workouts.length === 0}
            className="text-[10px] text-gray-400 hover:text-emerald-700 flex items-center gap-0.5 px-2 py-1 rounded hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Copy size={10} /> → Cykl ({cycleWeekCount} tyg.)
          </button>
          <button
            onClick={() => { setShowCopy(false); setPendingApply("program"); }}
            disabled={week.workouts.length === 0}
            className="text-[10px] text-gray-400 hover:text-violet-700 flex items-center gap-0.5 px-2 py-1 rounded hover:bg-violet-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Copy size={10} /> → Program ({totalWeekCount} tyg.)
          </button>
          <button onClick={onClose} className="p-1 rounded text-gray-300 hover:text-gray-600"><X size={14} /></button>
        </div>
      </div>

      {pendingApply && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
          <p className="text-xs text-amber-800 flex-1 min-w-0">
            {pendingApply === "cycle"
              ? `Nadpisać szablon wszystkich ${cycleWeekCount} tygodni w tym cyklu?`
              : `Nadpisać szablon wszystkich ${totalWeekCount} tygodni w całym programie?`}
          </p>
          <div className="flex gap-1 shrink-0">
            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setPendingApply(null)}>Anuluj</Button>
            <Button size="sm" className="h-6 text-xs px-2 bg-amber-600 hover:bg-amber-700 text-white border-0"
              onClick={() => {
                if (pendingApply === "cycle") onApplyToAllInCycle(week.workouts);
                else onApplyToAll(week.workouts);
                setPendingApply(null);
              }}>
              ✓ Zastosuj
            </Button>
          </div>
        </div>
      )}

      {showCopy && (
        <div className="flex gap-2 items-center bg-white rounded-lg p-2 border border-gray-200">
          <Select value={copyFrom} onValueChange={setCopyFrom}>
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Wybierz tydzień źródłowy" /></SelectTrigger>
            <SelectContent>
              {allWeeks.filter(aw => aw.week.id !== week.id).map(aw => (
                <SelectItem key={aw.week.id} value={aw.week.id} className="text-xs">
                  T{aw.globalIndex + 1} — {aw.cycle.name}{aw.week.name ? ` · ${aw.week.name}` : ""}
                  {aw.week.workouts.length > 0 ? ` (${aw.week.workouts.length} treningów)` : " (pusty)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-7 text-xs shrink-0" onClick={handleCopyFrom} disabled={!copyFrom}>Kopiuj</Button>
        </div>
      )}

      <div className="space-y-2">
        {DAYS_OF_WEEK.map(day => {
          const dayWorkouts = week.workouts.filter(w => w.day === day);
          return (
            <div key={day} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
                <span className="text-xs font-semibold text-gray-700">{day}</span>
                <button onClick={() => setAddingDay(day)} className="p-1 rounded-md text-gray-300 hover:text-primary hover:bg-primary/10">
                  <Plus size={13} />
                </button>
              </div>
              {dayWorkouts.length > 0 ? (
                <div className="px-3 divide-y divide-gray-50">
                  {dayWorkouts.map(w => (
                    <PlannedWorkoutCard
                      key={w.id} w={w}
                      onEdit={() => setEditingWorkout(w)}
                      onDelete={() => deleteWorkout(w.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-300 px-3 py-2">Brak</p>
              )}
            </div>
          );
        })}
      </div>

      <WorkoutFormDialog
        open={addingDay !== null}
        defaultDay={addingDay ?? "Poniedziałek"}
        onSave={addWorkout}
        onClose={() => setAddingDay(null)}
      />
      <WorkoutFormDialog
        open={editingWorkout !== null}
        initial={editingWorkout}
        onSave={data => { if (editingWorkout) updateWorkout(editingWorkout.id, data); }}
        onClose={() => setEditingWorkout(null)}
      />
    </div>
  );
}

// ─── ProgramTimeline ──────────────────────────────────────────────────────────

function ProgramTimeline({
  program, selectedIdx, onSelect,
}: {
  program: TrainingProgram;
  selectedIdx: number | null;
  onSelect: (gi: number) => void;
}) {
  const allWeeks = getAllWeeksFlat(program);
  const currentIdx = getCurrentGlobalWeekIndex(program);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = currentIdx ?? selectedIdx;
    if (target === null || !scrollRef.current) return;
    const el = scrollRef.current.children[target] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentIdx, selectedIdx]);

  if (allWeeks.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-1" ref={scrollRef as React.RefObject<HTMLDivElement>}>
      <div className="flex gap-0.5 min-w-max">
        {allWeeks.map(({ globalIndex, cycle, week }) => {
          const col = CYCLE_COLORS[cycle.color];
          const isCurrent = globalIndex === currentIdx;
          const isSelected = globalIndex === selectedIdx;
          return (
            <button
              key={globalIndex}
              onClick={() => onSelect(globalIndex)}
              title={`T${globalIndex + 1}: ${cycle.name}${week.name ? ` · ${week.name}` : ""}${week.goal ? ` · ${week.goal}` : ""}`}
              className={`w-7 h-8 rounded text-[9px] font-bold flex items-center justify-center transition-all shrink-0 ${col.segment} ${col.text} ${
                isCurrent ? "ring-2 ring-offset-1 ring-gray-600 opacity-100" : "opacity-60 hover:opacity-100"
              } ${isSelected && !isCurrent ? "ring-2 ring-offset-1 ring-primary opacity-100" : ""}`}
            >
              {globalIndex + 1}
            </button>
          );
        })}
      </div>
      {/* Cycle labels below */}
      <div className="flex gap-2 mt-1.5 min-w-max">
        {program.cycles.map(c => {
          const col = CYCLE_COLORS[c.color];
          return (
            <div key={c.id} className={`flex items-center gap-1 text-[9px] font-semibold ${col.text} max-w-[80px]`} title={c.name}>
              <div className={`w-2 h-2 rounded-full ${col.bar} shrink-0`} />
              <span className="truncate">{c.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CycleSection ─────────────────────────────────────────────────────────────

function CycleSection({
  cycle, cycleIndex, globalWeekOffset, totalCycles, allWeeks, totalWeekCount,
  onUpdate, onDelete, onMoveUp, onMoveDown, onDuplicate, onApplyToAll,
}: {
  cycle: ProgramCycle;
  cycleIndex: number;
  globalWeekOffset: number;
  totalCycles: number;
  allWeeks: { globalIndex: number; week: ProgramWeek; cycle: { name: string } }[];
  totalWeekCount: number;
  onUpdate: (c: ProgramCycle) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onApplyToAll: (workouts: PlannedWorkout[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingWeekIdx, setEditingWeekIdx] = useState<number | null>(null);
  const col = CYCLE_COLORS[cycle.color];

  const updateWeek = (wi: number, w: ProgramWeek) => {
    const weeks = [...cycle.weeks];
    weeks[wi] = w;
    onUpdate({ ...cycle, weeks });
  };
  const addWeek = () => onUpdate({ ...cycle, weeks: [...cycle.weeks, createEmptyWeek()] });
  const removeWeek = (wi: number) => {
    if (cycle.weeks.length <= 1) return;
    onUpdate({ ...cycle, weeks: cycle.weeks.filter((_, i) => i !== wi) });
    if (editingWeekIdx === wi) setEditingWeekIdx(null);
    else if (editingWeekIdx !== null && editingWeekIdx > wi) setEditingWeekIdx(editingWeekIdx - 1);
  };
  const applyToAllInCycle = (workouts: PlannedWorkout[]) => {
    onUpdate({
      ...cycle,
      weeks: cycle.weeks.map(w => ({ ...w, workouts: workouts.map(pw => ({ ...pw, id: uid() })) })),
    });
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${col.border}`}>
      {/* Cycle header */}
      <div className={`${col.bg} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
            <div className={`w-3 h-3 rounded-full shrink-0 ${col.bar}`} />
            <span className={`flex-1 min-w-0 text-sm font-bold ${col.text} truncate`} title={cycle.name}>{cycle.name}</span>
            <span className="text-xs text-gray-400 shrink-0">{cycle.weeks.length} tyg.</span>
            {expanded ? <ChevronUp size={14} className="text-gray-400 ml-auto shrink-0" /> : <ChevronDown size={14} className="text-gray-400 ml-auto shrink-0" />}
          </button>
          <div className="flex gap-0.5 shrink-0">
            {cycleIndex > 0 && <button onClick={onMoveUp} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-white/60 text-[10px]">▲</button>}
            {cycleIndex < totalCycles - 1 && <button onClick={onMoveDown} className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-white/60 text-[10px]">▼</button>}
            <button onClick={onDuplicate} className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-white/60" title="Duplikuj cykl"><Copy size={12} /></button>
            <button onClick={onDelete} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Usuń cykl"><Trash2 size={12} /></button>
          </div>
        </div>

        {/* Cycle info inline edit when expanded */}
        {expanded && (
          <div className="mt-2 space-y-1.5">
            <Input
              value={cycle.name}
              onChange={e => onUpdate({ ...cycle, name: e.target.value })}
              placeholder="Nazwa cyklu"
              className="h-7 text-xs bg-white/70"
            />
            <div className="flex gap-1.5 flex-wrap">
              {CYCLE_COLOR_KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => onUpdate({ ...cycle, color: k as CycleColorKey })}
                  className={`w-5 h-5 rounded-full ${CYCLE_COLORS[k as CycleColorKey].bar} transition-transform ${cycle.color === k ? "ring-2 ring-offset-1 ring-gray-600 scale-110" : "opacity-60 hover:opacity-100"}`}
                />
              ))}
            </div>
            <Input
              value={cycle.goal ?? ""}
              onChange={e => onUpdate({ ...cycle, goal: e.target.value || undefined } as ProgramCycle)}
              placeholder="Cel cyklu (opcjonalnie)"
              className="h-7 text-xs bg-white/70"
            />
          </div>
        )}
      </div>

      {/* Week list */}
      {expanded && (
        <div className="divide-y divide-gray-100 bg-white">
          {cycle.weeks.map((week, wi) => {
            const globalNum = globalWeekOffset + wi + 1;
            const isEditing = editingWeekIdx === wi;
            return (
              <div key={week.id}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${col.badge}`}>{globalNum}</span>
                  <Input
                    value={week.name ?? ""}
                    onChange={e => updateWeek(wi, { ...week, name: e.target.value || undefined })}
                    placeholder={`Tydzień ${globalNum}`}
                    className="h-7 text-xs flex-1 min-w-0"
                  />
                  <Input
                    value={week.goal ?? ""}
                    onChange={e => updateWeek(wi, { ...week, goal: e.target.value || undefined })}
                    placeholder="Cel"
                    className="h-7 text-xs w-28 shrink-0 hidden sm:block"
                  />
                  <button
                    onClick={() => setEditingWeekIdx(isEditing ? null : wi)}
                    className={`shrink-0 px-2 h-7 rounded-md text-xs font-semibold transition-colors ${isEditing ? `${col.badge} ${col.text}` : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {isEditing ? "Zamknij" : "Szablon"}
                    {!isEditing && week.workouts.length > 0 && <span className="ml-1 text-primary font-bold">({week.workouts.length})</span>}
                  </button>
                  <button onClick={() => removeWeek(wi)} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 shrink-0" title="Usuń tydzień">
                    <Trash2 size={12} />
                  </button>
                </div>
                {isEditing && (
                  <WeekTemplateEditor
                    week={week}
                    allWeeks={allWeeks}
                    globalWeekNumber={globalNum}
                    onUpdate={w => updateWeek(wi, w)}
                    onClose={() => setEditingWeekIdx(null)}
                    onApplyToAllInCycle={applyToAllInCycle}
                    onApplyToAll={onApplyToAll}
                    cycleWeekCount={cycle.weeks.length}
                    totalWeekCount={totalWeekCount}
                  />
                )}
              </div>
            );
          })}
          <div className="px-3 py-2">
            <button onClick={addWeek} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              <Plus size={12} /> Dodaj tydzień
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ProgramTab ──────────────────────────────────────────────────────────

interface ProgramTabProps {
  program: TrainingProgram | null;
  onChange: (p: TrainingProgram) => void;
}

export function ProgramTab({ program, onChange }: ProgramTabProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewWeekIdx, setViewWeekIdx] = useState<number | null>(null);

  const currentGlobalIdx = program ? getCurrentGlobalWeekIndex(program) : null;
  const displayWeekIdx = viewWeekIdx ?? currentGlobalIdx;
  const displayWeekLoc = program && displayWeekIdx !== null ? getWeekByGlobalIndex(program, displayWeekIdx) : null;

  const update = (updater: (p: TrainingProgram) => TrainingProgram) => {
    if (program) onChange(updater(program));
  };

  const updateCycle = (ci: number, updater: (c: ProgramCycle) => ProgramCycle) => {
    update(p => {
      const cycles = [...p.cycles];
      cycles[ci] = updater(cycles[ci]);
      return { ...p, cycles };
    });
  };

  const addCycle = () => {
    if (!program) return;
    const colors = CYCLE_COLOR_KEYS;
    const nextColor = colors[program.cycles.length % colors.length];
    onChange({ ...program, cycles: [...program.cycles, createEmptyCycle(`Cykl ${program.cycles.length + 1}`, nextColor)] });
  };

  const removeCycle = (ci: number) => {
    update(p => ({ ...p, cycles: p.cycles.filter((_, i) => i !== ci) }));
  };

  const moveCycle = (ci: number, dir: -1 | 1) => {
    update(p => {
      const cycles = [...p.cycles];
      const ni = ci + dir;
      if (ni < 0 || ni >= cycles.length) return p;
      [cycles[ci], cycles[ni]] = [cycles[ni], cycles[ci]];
      return { ...p, cycles };
    });
  };

  const duplicateCycle = (ci: number) => {
    update(p => {
      const orig = p.cycles[ci];
      const copy: ProgramCycle = {
        ...orig,
        id: uid(),
        name: orig.name + " (kopia)",
        weeks: orig.weeks.map(w => ({
          ...w,
          id: uid(),
          workouts: w.workouts.map(pw => ({ ...pw, id: uid() })),
        })),
      };
      const cycles = [...p.cycles];
      cycles.splice(ci + 1, 0, copy);
      return { ...p, cycles };
    });
  };

  // All weeks flat for "copy from" selectors
  const allWeeksForCopy = program
    ? getAllWeeksFlat(program).map(aw => ({ globalIndex: aw.globalIndex, week: aw.week, cycle: { name: aw.cycle.name } }))
    : [];

  // Compute cycle offsets for global week numbers
  const cycleOffsets: number[] = [];
  let offset = 0;
  if (program) {
    for (const c of program.cycles) {
      cycleOffsets.push(offset);
      offset += c.weeks.length;
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!program) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
          <Target size={32} className="text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Brak programu treningowego</h3>
          <p className="text-sm text-gray-400 mt-1">Stwórz swój wielotygodniowy plan przygotowań do celu.</p>
        </div>
        <Button onClick={() => { onChange(createDefaultProgram()); setIsEditMode(true); }} className="bg-primary hover:bg-primary/90">
          <Plus size={16} className="mr-2" /> Utwórz program
        </Button>
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (isEditMode) {
    const startDate = getProgramStartDate(program);
    return (
      <div className="space-y-4">
        {/* Edit mode header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Edytujesz program</h3>
          <Button size="sm" variant="outline" onClick={() => setIsEditMode(false)} className="gap-1">
            <Eye size={14} /> Podgląd
          </Button>
        </div>

        {/* Program info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Program</p>
          <Input value={program.name} onChange={e => update(p => ({ ...p, name: e.target.value }))} placeholder="Nazwa programu" className="text-sm font-semibold" />
          <Input value={program.goal ?? ""} onChange={e => update(p => ({ ...p, goal: e.target.value || undefined }))} placeholder="Cel programu (np. Start w zawodach XYZ)" className="text-xs" />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tryb daty</Label>
              <Select value={program.dateMode} onValueChange={v => update(p => ({ ...p, dateMode: v as "start" | "end" }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="start" className="text-xs">Data rozpoczęcia</SelectItem>
                  <SelectItem value="end" className="text-xs">Data zakończenia (zawody)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{program.dateMode === "start" ? "Data startu (pon. T1)" : "Data zawodów / końca"}</Label>
              <Input
                type="date"
                value={program.anchorDate ?? ""}
                onChange={e => update(p => ({ ...p, anchorDate: e.target.value || undefined }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {startDate && (
            <p className="text-xs text-gray-400">
              Program: {program.dateMode === "start" ? "od " : "od "}
              {startDate.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })}
              {" "} · {getProgramTotalWeeks(program)} tygodni
            </p>
          )}

          <Textarea
            value={program.description ?? ""}
            onChange={e => update(p => ({ ...p, description: e.target.value || undefined }))}
            placeholder="Opis programu (opcjonalnie)"
            className="resize-none h-16 text-xs"
          />
          <Textarea
            value={program.generalNotes ?? ""}
            onChange={e => update(p => ({ ...p, generalNotes: e.target.value || undefined }))}
            placeholder="Ogólne notatki..."
            className="resize-none h-16 text-xs"
          />
        </div>

        {/* Timeline preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Oś programu</p>
          <ProgramTimeline program={program} selectedIdx={null} onSelect={() => {}} />
        </div>

        {/* Cycles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cykle</p>
            <Button size="sm" variant="outline" onClick={addCycle} className="h-7 text-xs gap-1">
              <Plus size={12} /> Dodaj cykl
            </Button>
          </div>
          {program.cycles.map((cycle, ci) => (
            <CycleSection
              key={cycle.id}
              cycle={cycle}
              cycleIndex={ci}
              globalWeekOffset={cycleOffsets[ci] ?? 0}
              totalCycles={program.cycles.length}
              allWeeks={allWeeksForCopy}
              totalWeekCount={getProgramTotalWeeks(program)}
              onUpdate={c => updateCycle(ci, () => c)}
              onDelete={() => removeCycle(ci)}
              onMoveUp={() => moveCycle(ci, -1)}
              onMoveDown={() => moveCycle(ci, 1)}
              onDuplicate={() => duplicateCycle(ci)}
              onApplyToAll={workouts => update(p => ({
                ...p,
                cycles: p.cycles.map(c => ({
                  ...c,
                  weeks: c.weeks.map(w => ({ ...w, workouts: workouts.map(pw => ({ ...pw, id: uid() })) })),
                })),
              }))}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Current week banner */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-800 line-clamp-2" title={program.name}>{program.name}</p>
            {program.goal && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1" title={program.goal}>{program.goal}</p>
            )}
            {program.description && (
              <p className="text-xs text-gray-400 italic mt-0.5 whitespace-pre-wrap">{program.description}</p>
            )}
            {displayWeekLoc ? (
              <>
                <h3 className="font-bold text-gray-900 text-sm mt-0.5">
                  Tydzień {(displayWeekIdx ?? 0) + 1} z {getProgramTotalWeeks(program)}
                  {viewWeekIdx !== null && viewWeekIdx !== currentGlobalIdx && (
                    <button onClick={() => setViewWeekIdx(null)} className="ml-2 text-xs text-primary font-semibold hover:underline">← aktualny</button>
                  )}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full max-w-[8rem] truncate inline-block ${CYCLE_COLORS[displayWeekLoc.cycle.color].badge}`}
                    title={displayWeekLoc.cycle.name}
                  >
                    {displayWeekLoc.cycle.name}
                  </span>
                  <span className="text-xs text-gray-400">T{displayWeekLoc.weekIndexInCycle + 1}/{displayWeekLoc.cycle.weeks.length} w cyklu</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{formatWeekDateRange(program, displayWeekIdx ?? 0)}</span>
                </div>
                {displayWeekLoc.week.goal && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1 min-w-0" title={displayWeekLoc.week.goal}>
                    <Target size={11} className="text-primary shrink-0" />
                    <span className="truncate">{displayWeekLoc.week.goal}</span>
                  </p>
                )}
                {displayWeekLoc.week.name && (
                  <p className="text-xs text-gray-400 mt-0.5 italic truncate" title={displayWeekLoc.week.name}>{displayWeekLoc.week.name}</p>
                )}
              </>
            ) : (
              <div className="mt-1">
                <p className="text-sm font-semibold text-gray-500">
                  {program.anchorDate ? "Program poza aktywnym zakresem" : "Ustaw datę, aby aktywować program"}
                </p>
                {!program.anchorDate && (
                  <button onClick={() => setIsEditMode(true)} className="text-xs text-primary font-semibold hover:underline mt-0.5">
                    Przejdź do edycji →
                  </button>
                )}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsEditMode(true)} className="gap-1 shrink-0">
            <Settings size={14} /> Edytuj
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Oś programu</p>
        <ProgramTimeline
          program={program}
          selectedIdx={displayWeekIdx}
          onSelect={gi => setViewWeekIdx(gi === currentGlobalIdx ? null : gi)}
        />
      </div>

      {/* Week workouts */}
      {displayWeekLoc && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Treningi · Tydzień {(displayWeekIdx ?? 0) + 1}
            </p>
            {program.goal && (
              <span className="text-xs text-gray-400 italic truncate max-w-[40%]" title={program.goal}>{program.goal}</span>
            )}
          </div>
          {DAYS_OF_WEEK.map(day => {
            const dayWorkouts = displayWeekLoc.week.workouts.filter(w => w.day === day);
            if (dayWorkouts.length === 0) return null;
            return (
              <div key={day}>
                <p className="text-xs font-semibold text-gray-500 mb-1">{day}</p>
                <div className="bg-gray-50 rounded-xl px-3 divide-y divide-gray-100">
                  {dayWorkouts.map(w => <PlannedWorkoutCard key={w.id} w={w} />)}
                </div>
              </div>
            );
          })}
          {displayWeekLoc.week.workouts.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Ten tydzień nie ma jeszcze żadnych treningów.{" "}
              <button onClick={() => setIsEditMode(true)} className="text-primary font-semibold hover:underline">Dodaj →</button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
