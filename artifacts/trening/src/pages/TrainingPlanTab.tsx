import { useState } from "react";
import {
  TrainingPlan, TrainingPlanEntry, WorkoutType, DAYS_OF_WEEK, DayOfWeek,
  IntensityLevel, CycleWeek, INTENSITY_CONFIG,
} from "../types/workout";
import { TYPE_CONFIG } from "../components/WorkoutCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Calendar, StickyNote, ChevronDown, ChevronUp, Download, GripVertical, RotateCcw } from "lucide-react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TYPE_LABELS: Record<WorkoutType, string> = {
  bieg: "Bieg",
  bieg_latwy: "Bieg łatwy",
  bieg_dlugi: "Bieg długi",
  bieg_jakosciowy: "Bieg jakościowy",
  siła: "Siła",
  joga: "Joga",
  rozciaganie: "Rozciąganie",
  mobility: "Mobility",
  joga_rozciaganie: "Joga / Rozciąganie",
  zabawa_biegowa: "Zabawa biegowa",
  rower: "Rower",
  spacer: "Spacer",
  relaksacja: "Relaksacja",
  inne: "Inne",
};

const INTENSITY_OPTIONS: { value: IntensityLevel; label: string }[] = [
  { value: "lekki",       label: "Lekki"       },
  { value: "umiarkowany", label: "Umiarkowany" },
  { value: "ciężki",      label: "Ciężki"      },
  { value: "regeneracja", label: "Regeneracja" },
];

type EntryForm = { type: WorkoutType; name: string; description: string };
const EMPTY_FORM: EntryForm = { type: "bieg", name: "", description: "" };

interface TrainingPlanTabProps {
  plan: TrainingPlan;
  onChange: (plan: TrainingPlan) => void;
  onLoadWeek: () => void;
}

// ─── Cycle bar ───────────────────────────────────────────────────────────────

function CycleBar({ weeks, startDate }: { weeks: CycleWeek[]; startDate?: string }) {
  let activeIndex = -1;
  if (startDate && weeks.length > 0) {
    const start = new Date(startDate);
    const now = new Date();
    const weeksDiff = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksDiff >= 0) activeIndex = weeksDiff % weeks.length;
  }

  return (
    <div>
      <div className="flex gap-1 rounded-xl overflow-hidden">
        {weeks.map((week, i) => (
          <div
            key={week.id}
            className={`flex-1 relative ${INTENSITY_CONFIG[week.intensity].barCls} transition-all`}
          >
            <div className={`h-9 flex flex-col items-center justify-center ${i === activeIndex ? "ring-2 ring-inset ring-white/60" : ""}`}>
              <span className="text-white text-[10px] font-bold leading-none">{i + 1}</span>
              <span className="text-white/80 text-[9px] leading-none mt-0.5 hidden sm:block">
                {INTENSITY_CONFIG[week.intensity].label.slice(0, 3)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {activeIndex >= 0 && (
        <div className="flex gap-1 mt-1">
          {weeks.map((_, i) => (
            <div key={i} className="flex-1 flex justify-center">
              {i === activeIndex && (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1 mt-0.5">
        {weeks.map((w, i) => (
          <div key={w.id} className={`flex-1 text-center text-[9px] font-medium ${
            i === activeIndex ? INTENSITY_CONFIG[w.intensity].textCls : "text-gray-400"
          }`}>
            {INTENSITY_CONFIG[w.intensity].label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cycle week row ──────────────────────────────────────────────────────────

function CycleWeekRow({
  week,
  weekNumber,
  onUpdate,
  onDelete,
}: {
  week: CycleWeek;
  weekNumber: number;
  onUpdate: (w: CycleWeek) => void;
  onDelete: () => void;
}) {
  const cfg = INTENSITY_CONFIG[week.intensity];
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
      <span className="text-xs font-bold text-gray-400 w-5 shrink-0 text-center">{weekNumber}</span>
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.barCls}`} />
      <Select
        value={week.intensity}
        onValueChange={(v) => onUpdate({ ...week, intensity: v as IntensityLevel })}
      >
        <SelectTrigger className="h-7 text-xs w-36 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INTENSITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={week.notes ?? ""}
        onChange={(e) => onUpdate({ ...week, notes: e.target.value || undefined })}
        placeholder="Uwagi do tygodnia (opcjonalnie)"
        className="h-7 text-xs flex-1 min-w-0"
      />
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        title="Usuń tydzień"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Entry form ────────────────────────────────────────────────────────────

function EntryFormPanel({
  initial,
  onSave,
  onCancel,
  label,
}: {
  initial: EntryForm;
  onSave: (form: EntryForm) => void;
  onCancel: () => void;
  label: string;
}) {
  const [form, setForm] = useState<EntryForm>(initial);

  return (
    <div className="bg-white border border-primary/20 rounded-xl p-3 space-y-3 shadow-sm">
      <p className="text-xs font-semibold text-primary">{label}</p>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Typ</Label>
          <Select
            value={form.type}
            onValueChange={(v) => {
              const t = v as WorkoutType;
              setForm((f) => ({
                ...f,
                type: t,
                name:
                  f.name === "" || Object.values(TYPE_LABELS).includes(f.name)
                    ? TYPE_LABELS[t]
                    : f.name,
              }));
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).filter(([v]) => v !== "joga_rozciaganie").map(([v, l]) => (
                <SelectItem key={v} value={v} className="text-xs">
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nazwa</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="np. Bieg interwałowy"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Opis / uwagi (opcjonalnie)</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Ogólne wskazówki, intensywność, czas trwania..."
            className="resize-none h-14 text-xs"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (form.name.trim()) onSave({ ...form, name: form.name.trim() });
          }}
          className="h-7 text-xs"
          disabled={!form.name.trim()}
        >
          Zapisz
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          className="h-7 text-xs text-gray-500"
        >
          Anuluj
        </Button>
      </div>
    </div>
  );
}

// ─── Sortable entry row ─────────────────────────────────────────────────────

function SortableEntryRow({
  entry,
  isEditing,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: {
  entry: TrainingPlanEntry;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: (form: EntryForm) => void;
  onCancelEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG["inne"];

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <EntryFormPanel
          initial={{ type: entry.type, name: entry.name, description: entry.description ?? "" }}
          label="Edytuj jednostkę"
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 group"
    >
      <button
        {...listeners}
        {...attributes}
        className="touch-none mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
        tabIndex={-1}
        aria-label="Przeciągnij, aby zmienić kolejność"
      >
        <GripVertical size={14} />
      </button>

      <Badge className={`text-[10px] px-1.5 py-0 rounded-full font-semibold border-0 shrink-0 mt-0.5 ${cfg.badgeCls}`}>
        {cfg.label}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{entry.name}</p>
        {entry.description && (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{entry.description}</p>
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md text-gray-300 hover:text-primary hover:bg-white transition-colors"
          title="Edytuj"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-white transition-colors"
          title="Usuń"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Day card ───────────────────────────────────────────────────────────────

function DayCard({
  day,
  entries,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  day: DayOfWeek;
  entries: TrainingPlanEntry[];
  onAdd: (form: EntryForm) => void;
  onUpdate: (id: string, form: EntryForm) => void;
  onDelete: (id: string) => void;
  onReorder: (entries: TrainingPlanEntry[]) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    onReorder(arrayMove(entries, oldIndex, newIndex));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-gray-900">{day}</span>
          {entries.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {entries.length}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown size={15} className="text-gray-400" />
        ) : (
          <ChevronUp size={15} className="text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {entries.length === 0 && !showAddForm && (
            <p className="text-xs text-gray-400 italic">Brak zaplanowanych jednostek</p>
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {entries.map((entry) => (
                <SortableEntryRow
                  key={entry.id}
                  entry={entry}
                  isEditing={editId === entry.id}
                  onEdit={() => {
                    setEditId(entry.id);
                    setShowAddForm(false);
                  }}
                  onDelete={() => onDelete(entry.id)}
                  onSaveEdit={(form) => {
                    onUpdate(entry.id, form);
                    setEditId(null);
                  }}
                  onCancelEdit={() => setEditId(null)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {showAddForm ? (
            <EntryFormPanel
              initial={EMPTY_FORM}
              label="Nowa jednostka treningowa"
              onSave={(form) => {
                onAdd(form);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditId(null);
              }}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:bg-primary/5 px-2 py-1.5 rounded-lg transition-colors w-full"
            >
              <Plus size={13} /> Dodaj jednostkę
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main tab ───────────────────────────────────────────────────────────────

export function TrainingPlanTab({ plan, onChange, onLoadWeek }: TrainingPlanTabProps) {
  const [showNotes, setShowNotes] = useState(!!plan.generalNotes);
  const [showCycle, setShowCycle] = useState((plan.cycleWeeks ?? []).length > 0);

  const cycleWeeks = plan.cycleWeeks ?? [];

  const updateDay = (day: DayOfWeek, entries: TrainingPlanEntry[]) => {
    onChange({ ...plan, weeklyTemplate: { ...plan.weeklyTemplate, [day]: entries } });
  };

  const handleAdd = (day: DayOfWeek, form: EntryForm) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    updateDay(day, [...(plan.weeklyTemplate[day] ?? []), { id, ...form }]);
  };

  const handleUpdate = (day: DayOfWeek, id: string, form: EntryForm) => {
    updateDay(day, (plan.weeklyTemplate[day] ?? []).map((e) => (e.id === id ? { ...e, ...form } : e)));
  };

  const handleDelete = (day: DayOfWeek, id: string) => {
    updateDay(day, (plan.weeklyTemplate[day] ?? []).filter((e) => e.id !== id));
  };

  // ── Cycle handlers ──────────────────────────────────────────────
  const handleAddCycleWeek = () => {
    const lastIntensity = cycleWeeks.length > 0 ? cycleWeeks[cycleWeeks.length - 1].intensity : "umiarkowany";
    const newWeek: CycleWeek = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      intensity: lastIntensity as IntensityLevel,
    };
    onChange({ ...plan, cycleWeeks: [...cycleWeeks, newWeek] });
  };

  const handleUpdateCycleWeek = (updated: CycleWeek) => {
    onChange({ ...plan, cycleWeeks: cycleWeeks.map((w) => (w.id === updated.id ? updated : w)) });
  };

  const handleDeleteCycleWeek = (id: string) => {
    onChange({ ...plan, cycleWeeks: cycleWeeks.filter((w) => w.id !== id) });
  };

  const totalEntries = DAYS_OF_WEEK.reduce(
    (sum, d) => sum + (plan.weeklyTemplate[d]?.length ?? 0),
    0
  );

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div>
        <h3 className="font-bold text-gray-900">Plan treningowy</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Tygodniowy szablon treningów — załaduj do aktualnego tygodnia jednym kliknięciem
        </p>
      </div>

      {/* Load week */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900">Załaduj bieżący tydzień</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Dodaj wszystkie jednostki z szablonu ({totalEntries}) do aktualnego tygodnia
            </p>
          </div>
          <Button
            size="sm"
            onClick={onLoadWeek}
            disabled={totalEntries === 0}
            className="gap-1.5 shrink-0"
          >
            <Download size={13} /> Załaduj tydzień
          </Button>
        </div>
        {totalEntries === 0 && (
          <p className="text-xs text-gray-400 italic">
            Dodaj jednostki do szablonu poniżej, aby móc załadować tydzień.
          </p>
        )}
      </div>

      {/* ── Cykl treningowy ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          onClick={() => setShowCycle((v) => !v)}
        >
          <RotateCcw size={14} className="text-primary shrink-0" />
          <span className="text-sm font-semibold text-gray-800">Cykl treningowy</span>
          {cycleWeeks.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {cycleWeeks.length} {cycleWeeks.length === 1 ? "tydzień" : cycleWeeks.length < 5 ? "tygodnie" : "tygodni"}
            </span>
          )}
          <span className="ml-auto">
            {showCycle ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </span>
        </button>

        {showCycle && (
          <div className="px-4 pb-4 space-y-4">
            <p className="text-xs text-gray-400 -mt-1">
              Zdefiniuj intensywność dla każdego tygodnia cyklu. Treningi z szablonu powtarzają się automatycznie — nie musisz wpisywać ich co tydzień.
            </p>

            {/* Start date */}
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="text-xs shrink-0 text-gray-600">Tydzień 1 zaczął się:</Label>
              <Input
                type="date"
                value={plan.cycleStartDate ?? ""}
                onChange={(e) => onChange({ ...plan, cycleStartDate: e.target.value || undefined })}
                className="h-8 text-xs w-40"
              />
              {plan.cycleStartDate && (
                <button
                  onClick={() => onChange({ ...plan, cycleStartDate: undefined })}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Wyczyść
                </button>
              )}
            </div>

            {/* Cycle bar visual */}
            {cycleWeeks.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Wizualizacja cyklu:</p>
                <CycleBar weeks={cycleWeeks} startDate={plan.cycleStartDate} />
              </div>
            )}

            {/* Week list */}
            {cycleWeeks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Tygodnie:</p>
                {cycleWeeks.map((week, i) => (
                  <CycleWeekRow
                    key={week.id}
                    week={week}
                    weekNumber={i + 1}
                    onUpdate={handleUpdateCycleWeek}
                    onDelete={() => handleDeleteCycleWeek(week.id)}
                  />
                ))}
              </div>
            )}

            <button
              onClick={handleAddCycleWeek}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:bg-primary/5 px-2 py-1.5 rounded-lg transition-colors w-full"
            >
              <Plus size={13} />
              {cycleWeeks.length === 0 ? "Dodaj pierwszy tydzień cyklu" : "Dodaj kolejny tydzień"}
            </button>
          </div>
        )}
      </div>

      {/* General notes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          onClick={() => setShowNotes((v) => !v)}
        >
          <StickyNote size={14} className="text-amber-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800">Uwagi do planu</span>
          <span className="ml-auto">
            {showNotes ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </span>
        </button>
        {showNotes && (
          <div className="px-4 pb-4">
            <Textarea
              value={plan.generalNotes}
              onChange={(e) => onChange({ ...plan, generalNotes: e.target.value })}
              placeholder="Cel planu, dodatkowe wskazówki, uwagi do poszczególnych faz..."
              className="resize-none h-28 text-sm bg-amber-50/30 border-amber-100 focus:bg-white"
            />
          </div>
        )}
      </div>

      {/* Day cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-primary shrink-0" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Tygodniowy szablon
          </p>
          {totalEntries > 0 && (
            <span className="text-xs text-gray-400 ml-auto">
              przeciągnij ⠿ aby zmienić kolejność
            </span>
          )}
        </div>
        {DAYS_OF_WEEK.map((day) => (
          <DayCard
            key={day}
            day={day}
            entries={plan.weeklyTemplate[day] ?? []}
            onAdd={(form) => handleAdd(day, form)}
            onUpdate={(id, form) => handleUpdate(day, id, form)}
            onDelete={(id) => handleDelete(day, id)}
            onReorder={(sorted) => updateDay(day, sorted)}
          />
        ))}
      </div>
    </div>
  );
}
