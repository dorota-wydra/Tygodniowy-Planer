import { useState } from "react";
import { KeyDate } from "../types/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarHeart, Plus, Pencil, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

function parseDateStr(str: string): Date | null {
  const parts = str.split(".");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function daysUntil(dateStr: string): number | null {
  const date = parseDateStr(dateStr);
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86400000);
}

function sortedDates(dates: KeyDate[]): KeyDate[] {
  return [...dates].sort((a, b) => {
    const da = parseDateStr(a.date);
    const db = parseDateStr(b.date);
    if (!da || !db) return 0;
    return da.getTime() - db.getTime();
  });
}

interface KeyDateFormProps {
  initial?: Partial<KeyDate>;
  onSave: (data: Omit<KeyDate, "id">) => void;
  onCancel: () => void;
}

function KeyDateForm({ initial, onSave, onCancel }: KeyDateFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date.trim()) return;
    onSave({ name: name.trim(), date: date.trim(), description: desc.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Nazwa</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Bieg 5 km" required className="h-9" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Data (DD.MM.RRRR)</Label>
        <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="10.07.2026" required className="h-9" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Opis (opcjonalnie)</Label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Dodatkowe info..." className="h-14 resize-none text-sm" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="flex-1">Zapisz</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Anuluj</Button>
      </div>
    </form>
  );
}

interface KeyDatesSectionProps {
  dates: KeyDate[];
  onChange: (dates: KeyDate[]) => void;
}

export function KeyDatesSection({ dates, onChange }: KeyDatesSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editTarget, setEditTarget] = useState<KeyDate | null>(null);

  const allSorted = sortedDates(dates);
  const upcoming = allSorted.filter((kd) => { const d = daysUntil(kd.date); return d !== null && d >= 0; });
  const nearest = upcoming[0] ?? null;
  const nearestDays = nearest ? daysUntil(nearest.date) : null;

  const handleAdd = (data: Omit<KeyDate, "id">) => {
    onChange([...dates, { ...data, id: Date.now().toString() + Math.random().toString(36).slice(2, 6) }]);
    setShowAddForm(false);
  };

  const handleEdit = (data: Omit<KeyDate, "id">) => {
    if (!editTarget) return;
    onChange(dates.map((kd) => (kd.id === editTarget.id ? { ...editTarget, ...data } : kd)));
    setEditTarget(null);
  };

  const handleDelete = (id: string) => onChange(dates.filter((kd) => kd.id !== id));

  if (dates.length === 0 && !showAddForm) {
    return (
      <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors">
        <CalendarHeart size={13} /> Dodaj kluczową datę
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Nearest upcoming — always visible */}
      {nearest && !showAll && (
        <div className="flex items-center gap-2 text-sm">
          <CalendarHeart size={14} className="text-amber-500 shrink-0" />
          <span className="flex-1 min-w-0 font-semibold text-gray-800 truncate">{nearest.name}</span>
          <span className="text-gray-400 text-xs shrink-0">{nearest.date}</span>
          {nearestDays !== null && (
            <span className={`text-xs font-bold shrink-0 ${nearestDays === 0 ? "text-green-600" : nearestDays <= 7 ? "text-red-500" : "text-primary"}`}>
              {nearestDays === 0 ? "dziś!" : `${nearestDays} dni`}
            </span>
          )}
          <button onClick={() => setEditTarget(nearest)} className="text-gray-300 hover:text-primary p-0.5 shrink-0"><Pencil size={11} /></button>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-3">
        {dates.length > 1 && (
          <button onClick={() => setShowAll((v) => !v)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary font-medium transition-colors">
            {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAll ? "Ukryj" : `Pokaż wszystkie (${dates.length})`}
          </button>
        )}
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
            <Plus size={12} /> Dodaj
          </button>
        )}
      </div>

      {/* Expanded list */}
      <AnimatePresence>
        {showAll && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="space-y-1.5 pt-1">
              {allSorted.map((kd) => {
                const days = daysUntil(kd.date);
                const isPast = days !== null && days < 0;
                return (
                  <div key={kd.id} className={`flex items-center gap-2 py-1 px-2 rounded-lg text-sm ${isPast ? "opacity-50" : "bg-amber-50/50"}`}>
                    <CalendarHeart size={13} className={isPast ? "text-gray-400" : "text-amber-500"} />
                    <span className={`flex-1 min-w-0 font-medium truncate ${isPast ? "text-gray-400 line-through" : "text-gray-800"}`}>{kd.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{kd.date}</span>
                    {days !== null && !isPast && (
                      <span className={`text-xs font-bold shrink-0 ${days === 0 ? "text-green-600" : days <= 7 ? "text-red-500" : "text-primary"}`}>
                        {days === 0 ? "dziś!" : `${days} dni`}
                      </span>
                    )}
                    {days !== null && isPast && <span className="text-xs text-gray-400 shrink-0">{Math.abs(days)} dni temu</span>}
                    <button onClick={() => setEditTarget(kd)} className="text-gray-300 hover:text-primary p-0.5"><Pencil size={11} /></button>
                    <button onClick={() => handleDelete(kd.id)} className="text-gray-300 hover:text-red-500 p-0.5"><Trash2 size={11} /></button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-xl border border-gray-200 p-3 mt-1">
              <KeyDateForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edytuj termin</DialogTitle>
            <DialogDescription>Zaktualizuj szczegóły kluczowej daty.</DialogDescription>
          </DialogHeader>
          {editTarget && <KeyDateForm initial={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
