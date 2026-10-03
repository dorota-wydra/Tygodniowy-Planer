import { useState } from "react";
import { TrainingDataItem, TrainingDataEntry, BodyMeasurement } from "../types/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Database, Ruler, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

function todayStr(): string {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function genId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}

// ─── Training data ─────────────────────────────────────────────────────────

interface EntryFormProps {
  itemName?: string;
  onSave: (name: string, entry: TrainingDataEntry) => void;
  onCancel: () => void;
  lockName?: boolean;
}

function EntryForm({ itemName = "", onSave, onCancel, lockName = false }: EntryFormProps) {
  const [name, setName] = useState(itemName);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Podaj nazwę parametru."); return; }
    if (!value.trim()) { setError("Podaj wartość."); return; }
    setError("");
    onSave(name.trim(), { value: value.trim(), note: note.trim() || undefined, date: new Date().toISOString() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!lockName && (
        <div className="space-y-1.5">
          <Label>Nazwa parametru</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Średnie tempo" />
        </div>
      )}
      {lockName && <p className="text-sm font-semibold text-gray-700">{name}</p>}
      <div className="space-y-1.5">
        <Label>Nowa wartość</Label>
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="np. 5:20 min/km" />
      </div>
      <div className="space-y-1.5">
        <Label>Notatka (opcjonalnie)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kontekst, warunki..." className="resize-none h-16 text-sm" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button type="submit">Zapisz</Button>
      </DialogFooter>
    </form>
  );
}

function DataItemCard({ item, onAddEntry, onDelete }: {
  item: TrainingDataItem;
  onAddEntry: (item: TrainingDataItem) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = [...item.entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = entries[0];
  const older = entries.slice(1);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">{item.name}</p>
            {latest && (
              <>
                <p className="text-xl font-black text-gray-900 leading-tight mt-0.5">{latest.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(latest.date)}{latest.note && ` · ${latest.note}`}</p>
              </>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onAddEntry(item)} className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors" title="Zaktualizuj wartość">
              <Plus size={14} />
            </button>
            <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Usuń parametr">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {older.length > 0 && (
          <button onClick={() => setExpanded((e) => !e)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary mt-2 font-medium transition-colors">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Ukryj historię" : `Historia (${older.length})`}
          </button>
        )}

        <AnimatePresence>
          {expanded && older.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 space-y-1 border-t border-gray-50 pt-2">
                {older.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-300 line-through flex-1">{entry.value}</span>
                    <span className="text-xs text-gray-300 shrink-0">{fmtDate(entry.date)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Body measurements ─────────────────────────────────────────────────────

const MEASUREMENT_FIELDS: { key: keyof Omit<BodyMeasurement, "id" | "date" | "note">; label: string; unit: string }[] = [
  { key: "weight", label: "Masa ciała", unit: "kg" },
  { key: "waist",  label: "Talia",      unit: "cm" },
  { key: "hips",   label: "Biodra",     unit: "cm" },
  { key: "thigh",  label: "Udo",        unit: "cm" },
  { key: "arm",    label: "Ramię",      unit: "cm" },
];

function MeasurementForm({ onSave, onCancel }: { onSave: (m: Omit<BodyMeasurement, "id">) => void; onCancel: () => void }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const set = (key: string, val: string) => setFields((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const m: Omit<BodyMeasurement, "id"> = {
      date: new Date().toISOString(),
      note: note.trim() || undefined,
    };
    for (const { key } of MEASUREMENT_FIELDS) {
      if (fields[key]?.trim()) (m as Record<string, unknown>)[key] = fields[key].trim();
    }
    onSave(m);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {MEASUREMENT_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{label} <span className="text-gray-400">({unit})</span></Label>
            <Input
              type="number"
              step="0.1"
              value={fields[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
              placeholder="—"
              className="h-9 text-sm"
            />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Notatka (opcjonalnie)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Np. po śniadaniu, rano..." className="resize-none h-14 text-sm" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button type="submit">Zapisz pomiar</Button>
      </DialogFooter>
    </form>
  );
}

function MeasurementCard({ m, onDelete }: { m: BodyMeasurement; onDelete: (id: string) => void }) {
  const filled = MEASUREMENT_FIELDS.filter(({ key }) => !!(m as unknown as Record<string, unknown>)[key]);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 font-medium">{fmtDate(m.date)}</p>
        <button
          onClick={() => onDelete(m.id)}
          className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Usuń pomiar"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {filled.map(({ key, label, unit }) => (
          <div key={key} className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-sm font-bold text-gray-900">{(m as unknown as Record<string, unknown>)[key] as string} <span className="text-xs font-normal text-gray-400">{unit}</span></span>
          </div>
        ))}
      </div>
      {m.note && <p className="text-xs text-gray-400 mt-2">{m.note}</p>}
    </div>
  );
}

// ─── Main DataTab ──────────────────────────────────────────────────────────

interface DataTabProps {
  items: TrainingDataItem[];
  onChange: (items: TrainingDataItem[]) => void;
  measurements: BodyMeasurement[];
  onMeasurementsChange: (m: BodyMeasurement[]) => void;
}

export function DataTab({ items, onChange, measurements, onMeasurementsChange }: DataTabProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<TrainingDataItem | null>(null);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const { toast } = useToast();

  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleSaveEntry = (name: string, entry: TrainingDataEntry, lockToItem?: TrainingDataItem) => {
    if (lockToItem) {
      onChange(items.map((it) =>
        it.id === lockToItem.id
          ? { ...it, entries: [entry, ...it.entries] }
          : it
      ));
      setUpdateTarget(null);
      toast({ title: "Zaktualizowano", description: `${lockToItem.name}: ${entry.value}` });
    } else {
      const existing = items.find((it) => it.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        onChange(items.map((it) =>
          it.id === existing.id ? { ...it, entries: [entry, ...it.entries] } : it
        ));
        toast({ title: "Zaktualizowano", description: `${existing.name}: ${entry.value}` });
      } else {
        onChange([...items, { id: genId(), name, entries: [entry] }]);
        toast({ title: "Dodano parametr", description: `${name}: ${entry.value}` });
      }
      setShowNewForm(false);
    }
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
    toast({ title: "Usunięto parametr" });
  };

  const handleAddMeasurement = (m: Omit<BodyMeasurement, "id">) => {
    onMeasurementsChange([{ ...m, id: genId() }, ...measurements]);
    setShowMeasurementForm(false);
    toast({ title: "Pomiar zapisany" });
  };

  const handleDeleteMeasurement = (id: string) => {
    onMeasurementsChange(measurements.filter((m) => m.id !== id));
    toast({ title: "Pomiar usunięty" });
  };

  const SUGGESTIONS = [
    { name: "Średnie tempo", value: "5:30 min/km" },
    { name: "Tempo interwałów", value: "4:45 min/km" },
    { name: "Maks. tętno", value: "182 bpm" },
    { name: "Wyciskany ciężar", value: "60 kg" },
  ];

  return (
    <div className="space-y-8">
      {/* ─── Parametry treningowe ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Parametry treningowe</h3>
            <p className="text-xs text-gray-400 mt-0.5">Historia zmian jest zachowywana</p>
          </div>
          <Button size="sm" onClick={() => setShowNewForm(true)} className="gap-1.5">
            <Plus size={14} /> Dodaj
          </Button>
        </div>

        {items.length === 0 && !showNewForm && (
          <div>
            <div className="text-center py-8 text-gray-400">
              <Database size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Brak parametrów</p>
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Szybki start</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => {
                    const entry: TrainingDataEntry = { value: s.value, date: new Date().toISOString() };
                    onChange([...items, { id: genId(), name: s.name, entries: [entry] }]);
                    toast({ title: "Dodano", description: s.name });
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 text-left group transition-colors"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-700 group-hover:text-primary">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.value}</p>
                  </div>
                  <Plus size={14} className="text-gray-300 group-hover:text-primary shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <DataItemCard item={item} onAddEntry={setUpdateTarget} onDelete={handleDelete} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Pomiary ciała ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Pomiary ciała</h3>
            <p className="text-xs text-gray-400 mt-0.5">Historia pomiarów jest zachowywana</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowMeasurementForm(true)} className="gap-1.5">
            <Ruler size={14} /> Dodaj pomiar
          </Button>
        </div>

        {sortedMeasurements.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Ruler size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Brak pomiarów</p>
            <p className="text-xs mt-1">Dodaj cotygodniowe pomiary, aby śledzić postępy</p>
          </div>
        )}

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sortedMeasurements.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <MeasurementCard m={m} onDelete={handleDeleteMeasurement} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Dialogs */}
      <Dialog open={showNewForm} onOpenChange={(o) => !o && setShowNewForm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nowy parametr</DialogTitle>
            <DialogDescription>Dodaj parametr treningowy lub wynik. Jeśli podasz istniejącą nazwę, wartość zostanie dołączona do historii.</DialogDescription>
          </DialogHeader>
          <EntryForm onSave={(name, entry) => handleSaveEntry(name, entry)} onCancel={() => setShowNewForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!updateTarget} onOpenChange={(o) => !o && setUpdateTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Zaktualizuj wartość</DialogTitle>
            <DialogDescription>Poprzednia wartość zostanie zachowana w historii.</DialogDescription>
          </DialogHeader>
          {updateTarget && (
            <EntryForm
              itemName={updateTarget.name}
              lockName
              onSave={(name, entry) => handleSaveEntry(name, entry, updateTarget)}
              onCancel={() => setUpdateTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showMeasurementForm} onOpenChange={(o) => !o && setShowMeasurementForm(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nowy pomiar ciała</DialogTitle>
            <DialogDescription>Wypełnij pola, które chcesz zapisać. Pozostałe możesz pominąć.</DialogDescription>
          </DialogHeader>
          <MeasurementForm onSave={handleAddMeasurement} onCancel={() => setShowMeasurementForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
