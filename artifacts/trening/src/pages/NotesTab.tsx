import { useState } from "react";
import { NoteItem } from "../types/workout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface NoteFormProps {
  initial?: Partial<NoteItem>;
  onSave: (data: Pick<NoteItem, "title" | "content">) => void;
  onCancel: () => void;
}

function NoteForm({ initial, onSave, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave({ title: title.trim(), content: content.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tytuł</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Plan na czerwiec" required />
      </div>
      <div className="space-y-1.5">
        <Label>Treść</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Wpisz treść notatki..."
          className="resize-none h-32 text-sm"
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button type="submit">Zapisz</Button>
      </DialogFooter>
    </form>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface NotesTabProps {
  notes: NoteItem[];
  onChange: (notes: NoteItem[]) => void;
}

export function NotesTab({ notes, onChange }: NotesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<NoteItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const sorted = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAdd = (data: Pick<NoteItem, "title" | "content">) => {
    const newNote: NoteItem = { ...data, id: Date.now().toString() + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString() };
    onChange([newNote, ...notes]);
    setShowForm(false);
    toast({ title: "Dodano notatkę" });
  };

  const handleEdit = (data: Pick<NoteItem, "title" | "content">) => {
    if (!editTarget) return;
    onChange(notes.map((n) => (n.id === editTarget.id ? { ...editTarget, ...data } : n)));
    setEditTarget(null);
    toast({ title: "Zaktualizowano notatkę" });
  };

  const handleDelete = (id: string) => {
    onChange(notes.filter((n) => n.id !== id));
    toast({ title: "Usunięto notatkę" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Notatki</h3>
          <p className="text-xs text-gray-400 mt-0.5">Ogólne przemyślenia i plany</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus size={14} /> Nowa
        </Button>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">Brak notatek</p>
          <p className="text-xs mt-1">Zapisz swoje przemyślenia i plany</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1.5" /> Utwórz notatkę
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {sorted.map((note) => {
            const isExpanded = expandedId === note.id;
            const isLong = note.content.length > 120;
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{note.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(note.createdAt)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditTarget(note)} className="p-1.5 rounded-md text-gray-300 hover:text-primary hover:bg-gray-50 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <p className={`text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap ${!isExpanded && isLong ? "line-clamp-3" : ""}`}>
                    {note.content}
                  </p>

                  {isLong && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : note.id)}
                      className="text-xs text-primary hover:text-primary/80 font-medium mt-1"
                    >
                      {isExpanded ? "Pokaż mniej" : "Czytaj więcej"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nowa notatka</DialogTitle>
            <DialogDescription>Zapisz swoje przemyślenia.</DialogDescription>
          </DialogHeader>
          <NoteForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj notatkę</DialogTitle>
            <DialogDescription>Zmień tytuł lub treść notatki.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <NoteForm initial={editTarget} onSave={handleEdit} onCancel={() => setEditTarget(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
