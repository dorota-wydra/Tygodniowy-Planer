import type { DayOfWeek, WorkoutType, IntensityLevel } from "./workout";

export type CycleColorKey = "sky" | "emerald" | "amber" | "rose" | "violet" | "teal" | "orange" | "indigo";

export const CYCLE_COLOR_KEYS: CycleColorKey[] = ["sky", "emerald", "amber", "rose", "violet", "teal", "orange", "indigo"];

export const CYCLE_COLORS: Record<CycleColorKey, {
  bg: string; text: string; border: string; bar: string; badge: string; segment: string; label: string;
}> = {
  sky:     { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     bar: "bg-sky-400",     badge: "bg-sky-100 text-sky-700",       segment: "bg-sky-300",     label: "Niebieski"    },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-400", badge: "bg-emerald-100 text-emerald-700", segment: "bg-emerald-300", label: "Zielony"      },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   bar: "bg-amber-400",   badge: "bg-amber-100 text-amber-700",   segment: "bg-amber-300",   label: "Żółty"        },
  rose:    { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    bar: "bg-rose-400",    badge: "bg-rose-100 text-rose-700",     segment: "bg-rose-300",    label: "Różowy"       },
  violet:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  bar: "bg-violet-400",  badge: "bg-violet-100 text-violet-700", segment: "bg-violet-300",  label: "Fioletowy"    },
  teal:    { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    bar: "bg-teal-400",    badge: "bg-teal-100 text-teal-700",     segment: "bg-teal-300",    label: "Turkusowy"    },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  bar: "bg-orange-400",  badge: "bg-orange-100 text-orange-700", segment: "bg-orange-300",  label: "Pomarańczowy" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",  bar: "bg-indigo-400",  badge: "bg-indigo-100 text-indigo-700", segment: "bg-indigo-300",  label: "Granatowy"    },
};

// ─── Data model ──────────────────────────────────────────────────────────────

export interface PlannedWorkout {
  id: string;
  day: DayOfWeek;
  type: WorkoutType;
  name: string;
  description?: string;
  intensity?: IntensityLevel;
  distance?: string;
  duration?: string;
  reps?: string;
  pace?: string;
  heartRate?: string;
  weight?: string;
  customNotes?: string;
}

export interface ProgramWeek {
  id: string;
  name?: string;
  goal?: string;
  info?: string;
  notes?: string;
  workouts: PlannedWorkout[];
}

export interface ProgramCycle {
  id: string;
  name: string;
  color: CycleColorKey;
  goal?: string;
  description?: string;
  info?: string;
  notes?: string;
  weeks: ProgramWeek[];
}

export type ProgramDateMode = "start" | "end";

export interface TrainingProgram {
  name: string;
  goal?: string;
  description?: string;
  generalNotes?: string;
  dateMode: ProgramDateMode;
  anchorDate?: string;
  cycles: ProgramCycle[];
}

// ─── Factories ───────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function createEmptyWeek(): ProgramWeek {
  return { id: uid(), workouts: [] };
}

export function createEmptyCycle(name: string, color: CycleColorKey, weekCount = 4): ProgramCycle {
  return { id: uid(), name, color, weeks: Array.from({ length: weekCount }, () => createEmptyWeek()) };
}

export function createDefaultProgram(): TrainingProgram {
  return {
    name: "Mój program treningowy",
    dateMode: "end",
    cycles: [
      createEmptyCycle("Baza", "sky", 4),
      createEmptyCycle("Budowanie", "emerald", 4),
      createEmptyCycle("Intensywność", "amber", 4),
      createEmptyCycle("Szczyt", "rose", 4),
    ],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getProgramTotalWeeks(p: TrainingProgram): number {
  return p.cycles.reduce((s, c) => s + c.weeks.length, 0);
}

export function getProgramStartDate(p: TrainingProgram): Date | null {
  if (!p.anchorDate) return null;
  const anchor = new Date(p.anchorDate);
  if (p.dateMode === "start") return anchor;
  const total = getProgramTotalWeeks(p);
  const start = new Date(anchor);
  start.setDate(start.getDate() - total * 7 + 1);
  const dow = start.getDay();
  start.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));
  return start;
}

export function getWeekStartDate(p: TrainingProgram, gi: number): Date | null {
  const s = getProgramStartDate(p);
  if (!s) return null;
  const d = new Date(s);
  d.setDate(d.getDate() + gi * 7);
  return d;
}

export function getCurrentGlobalWeekIndex(p: TrainingProgram): number | null {
  const s = getProgramStartDate(p);
  if (!s) return null;
  const total = getProgramTotalWeeks(p);
  const diff = Math.floor((Date.now() - s.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return diff >= 0 && diff < total ? diff : null;
}

export interface WeekLocation {
  cycle: ProgramCycle;
  week: ProgramWeek;
  cycleIndex: number;
  weekIndexInCycle: number;
  globalWeekIndex: number;
}

export function getWeekByGlobalIndex(p: TrainingProgram, gi: number): WeekLocation | null {
  let g = 0;
  for (let ci = 0; ci < p.cycles.length; ci++) {
    for (let wi = 0; wi < p.cycles[ci].weeks.length; wi++) {
      if (g === gi) return { cycle: p.cycles[ci], week: p.cycles[ci].weeks[wi], cycleIndex: ci, weekIndexInCycle: wi, globalWeekIndex: g };
      g++;
    }
  }
  return null;
}

export function getAllWeeksFlat(p: TrainingProgram): { globalIndex: number; cycleIndex: number; weekIndex: number; cycle: ProgramCycle; week: ProgramWeek }[] {
  const result: { globalIndex: number; cycleIndex: number; weekIndex: number; cycle: ProgramCycle; week: ProgramWeek }[] = [];
  let g = 0;
  for (let ci = 0; ci < p.cycles.length; ci++) {
    for (let wi = 0; wi < p.cycles[ci].weeks.length; wi++) {
      result.push({ globalIndex: g, cycleIndex: ci, weekIndex: wi, cycle: p.cycles[ci], week: p.cycles[ci].weeks[wi] });
      g++;
    }
  }
  return result;
}

const PAD = (n: number) => n.toString().padStart(2, "0");
const FMT = (d: Date) => `${PAD(d.getDate())}.${PAD(d.getMonth() + 1)}`;

export function formatWeekDateRange(p: TrainingProgram, gi: number): string {
  const s = getWeekStartDate(p, gi);
  if (!s) return "—";
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return `${FMT(s)} – ${FMT(e)}`;
}
