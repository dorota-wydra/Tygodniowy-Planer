import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WeekReflection } from "../types/workout";
import { Star } from "lucide-react";

interface WeeklyReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reflection: WeekReflection) => void;
}

const QUESTIONS: { key: keyof WeekReflection; label: string; placeholder: string; icon: string }[] = [
  {
    key: "q1",
    label: "Z czego jestem zadowolona w tym tygodniu?",
    placeholder: "Np. regularność, nowy rekord, dobre samopoczucie...",
    icon: "🌟",
  },
  {
    key: "q2",
    label: "Co było dla mnie trudne?",
    placeholder: "Np. zmęczenie, brak motywacji, ból...",
    icon: "💭",
  },
  {
    key: "q3",
    label: "Na czym chcę się skupić w przyszłym tygodniu?",
    placeholder: "Np. więcej rozciągania, wcześniejsze treningi...",
    icon: "🎯",
  },
];

export function WeeklyReflectionModal({ isOpen, onClose, onSave }: WeeklyReflectionModalProps) {
  const [answers, setAnswers] = useState<WeekReflection>({ q1: "", q2: "", q3: "" });

  const handleSave = () => {
    onSave(answers);
    setAnswers({ q1: "", q2: "", q3: "" });
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto" data-testid="modal-reflection">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Star className="text-white" size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Brawo! Tydzień ukończony 🎉</DialogTitle>
              <DialogDescription className="mt-0.5">
                Zanim zaczniesz nowy tydzień, poświęć chwilę na refleksję.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {QUESTIONS.map((q) => (
            <div key={q.key} className="space-y-2">
              <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span>{q.icon}</span>
                {q.label}
              </Label>
              <Textarea
                value={answers[q.key]}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                placeholder={q.placeholder}
                className="resize-none h-20 text-sm bg-gray-50 border-gray-200 focus:bg-white"
                data-testid={`input-reflection-${q.key}`}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={handleSkip} className="text-gray-500" data-testid="button-skip-reflection">
            Pomiń
          </Button>
          <Button onClick={handleSave} data-testid="button-save-reflection">
            Zapisz refleksję
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
