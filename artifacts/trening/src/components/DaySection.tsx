import { useState } from "react";
import { Workout, DayOfWeek } from "../types/workout";
import { WorkoutCard } from "./WorkoutCard";
import { useDroppable } from "@dnd-kit/core";
import { Plus, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface DaySectionProps {
  day: DayOfWeek;
  date: string;
  workouts: Workout[];
  onAddWorkout: (day: DayOfWeek) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onSkip: (id: string) => void;
  onMissed: (id: string, reason: string | null) => void;
  onEdit?: (workout: Workout) => void;
  isToday?: boolean;
  isPast?: boolean;
  activeDragId?: string | null;
}

export function DaySection({
  day,
  date,
  workouts,
  onAddWorkout,
  onToggleComplete,
  onDelete,
  onUpdateNotes,
  onSkip,
  onMissed,
  onEdit,
  isToday,
  isPast,
  activeDragId,
}: DaySectionProps) {
  const [collapsed, setCollapsed] = useState(isPast && !isToday);

  const activeWorkouts = workouts.filter((w) => !w.skipped);
  const hasWorkouts = workouts.length > 0;
  const allCompleted = activeWorkouts.length > 0 && activeWorkouts.every((w) => w.completed || w.missed);
  const completedCount = activeWorkouts.filter((w) => w.completed).length;

  const { setNodeRef, isOver } = useDroppable({ id: day });
  const isDraggingOver = isOver && activeDragId != null;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border bg-white transition-all shadow-sm ${
        isToday
          ? "ring-2 ring-[#FF9800] border-transparent"
          : isDraggingOver
          ? "ring-2 ring-primary/40 border-primary/20 bg-primary/5"
          : isPast
          ? "border-gray-100 opacity-80"
          : "border-gray-100"
      }`}
      data-testid={`section-day-${day}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          className="flex flex-col flex-1 text-left focus:outline-none"
          onClick={() => isPast && !isToday && setCollapsed((c) => !c)}
          data-testid={`button-collapse-${day}`}
        >
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-bold tracking-tight ${isPast && !isToday ? "text-gray-500" : "text-gray-900"}`}>
              {day}
            </h2>
            {allCompleted && (
              <span className="text-green-500 animate-in zoom-in duration-300">
                <CheckCircle2 size={18} className="fill-green-100" />
              </span>
            )}
            {isPast && !isToday && hasWorkouts && !allCompleted && (
              <span className="text-xs text-gray-400">{completedCount}/{activeWorkouts.length}</span>
            )}
          </div>
          <span className={`text-xs font-medium mt-0.5 ${isToday ? "text-[#FF9800]" : "text-gray-400"}`}>
            {date}{isToday ? " · dziś" : isPast ? " · miniony" : ""}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {isPast && !isToday && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              aria-label={collapsed ? "Rozwiń dzień" : "Zwiń dzień"}
            >
              {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          )}
          <button
            onClick={() => onAddWorkout(day)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-500 hover:bg-primary hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Dodaj trening na ${day}`}
            data-testid={`button-add-${day}`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 pb-5 flex flex-col gap-3 min-h-[60px]">
          {hasWorkouts ? (
            workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onUpdateNotes={onUpdateNotes}
                onSkip={onSkip}
                onMissed={onMissed}
                onEdit={onEdit}
              />
            ))
          ) : (
            <div className={`flex flex-col items-center justify-center py-5 text-center border-2 border-dashed rounded-xl transition-colors ${
              isDraggingOver ? "border-primary/40 bg-primary/5" : "border-gray-100 bg-gray-50/50"
            }`}>
              {isDraggingOver ? (
                <p className="text-sm text-primary font-medium">Upuść tutaj</p>
              ) : (
                <p className="text-sm text-gray-400 font-medium">Brak zaplanowanych treningów</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsed summary */}
      {collapsed && hasWorkouts && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400">
            {workouts.filter(w => !w.skipped).map((w) => w.name).join(", ")}
            {workouts.some(w => w.skipped) && ` · ${workouts.filter(w => w.skipped).length} pominięte`}
          </p>
        </div>
      )}
    </div>
  );
}
