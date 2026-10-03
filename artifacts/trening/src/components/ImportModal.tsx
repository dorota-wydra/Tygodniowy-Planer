import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { parseWorkoutText } from "../utils/parseWorkoutText";
import { Workout } from "../types/workout";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (workouts: Omit<Workout, "id" | "completed">[]) => void;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const parsedWorkouts = parseWorkoutText(text);
    if (parsedWorkouts.length > 0) {
      onImport(parsedWorkouts);
      setText("");
    }
    
    onClose();
  };

  const placeholderText = `Poniedziałek: bieg 5 km
Wtorek: trening siłowy
Środa: wolne
Czwartek: spacer 3 km`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setText("");
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-import">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-display">Importuj plan z tekstu</DialogTitle>
          <DialogDescription>
            Wklej swój plan tygodniowy, a my zamienimy go na interaktywne treningi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder={placeholderText}
            className="min-h-[250px] font-mono text-sm bg-gray-50 border-gray-200"
            data-testid="input-import-text"
          />
          
          <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm border border-blue-100">
            <strong>Wskazówka:</strong> Każda linia powinna zaczynać się od nazwy dnia tygodnia, po której następuje dwukropek (lub myślnik) i opis treningu. "Wolne" zostanie pominięte.
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-import">
              Anuluj
            </Button>
            <Button type="submit" disabled={!text.trim()} data-testid="button-submit-import">
              Importuj
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
