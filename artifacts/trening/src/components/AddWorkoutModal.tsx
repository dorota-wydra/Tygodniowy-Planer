import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { DayOfWeek, WorkoutType, Workout, DAYS_OF_WEEK } from "../types/workout";

interface AddWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: DayOfWeek | null;
  onAdd: (workout: Omit<Workout, "id" | "completed">) => void;
  /** When provided, the modal is in edit mode */
  editWorkout?: Workout | null;
  onSave?: (id: string, workout: Omit<Workout, "id" | "completed">) => void;
  unplanned?: boolean;
  remindersEnabled?: boolean;
}

export const DEFAULT_NAMES: Record<WorkoutType, string> = {
  siła: "Trening siłowy",
  joga: "Joga",
  rozciaganie: "Rozciąganie",
  mobility: "Mobility",
  joga_rozciaganie: "Joga / Rozciąganie",
  bieg: "Bieg",
  bieg_latwy: "Bieg łatwy",
  bieg_dlugi: "Bieg długi",
  bieg_jakosciowy: "Bieg jakościowy",
  zabawa_biegowa: "Zabawa biegowa",
  rower: "Rower",
  spacer: "Spacer",
  relaksacja: "Relaksacja",
  inne: "Inne aktywności",
};

const RUNNING_TYPES: Set<WorkoutType> = new Set(["bieg", "bieg_latwy", "bieg_dlugi", "bieg_jakosciowy", "zabawa_biegowa"]);

export function AddWorkoutModal({
  isOpen,
  onClose,
  selectedDay,
  onAdd,
  editWorkout = null,
  onSave,
  unplanned = false,
  remindersEnabled = false,
}: AddWorkoutModalProps) {
  const isEditing = !!editWorkout;

  const [type, setType] = useState<WorkoutType>("bieg");
  const [name, setName] = useState(DEFAULT_NAMES["bieg"]);
  const [description, setDescription] = useState("");
  const [day, setDay] = useState<DayOfWeek>(selectedDay ?? "Poniedziałek");
  const [plannedTime, setPlannedTime] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [warmup, setWarmup] = useState("");
  const [mainStage, setMainStage] = useState("");
  const [cooldown, setCooldown] = useState("");
  const [stagesOpen, setStagesOpen] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (editWorkout) {
      setType(editWorkout.type);
      setName(editWorkout.name);
      setDescription(editWorkout.description ?? "");
      setDay(editWorkout.day);
      setPlannedTime(editWorkout.plannedTime ?? "");
      setReminderEnabled(editWorkout.reminderEnabled ?? true);
      setWarmup(editWorkout.warmup ?? "");
      setMainStage(editWorkout.mainStage ?? "");
      setCooldown(editWorkout.cooldown ?? "");
      const hasStages = !!(editWorkout.warmup || editWorkout.mainStage || editWorkout.cooldown);
      setStagesOpen(RUNNING_TYPES.has(editWorkout.type) || hasStages);
    } else {
      setType("bieg");
      setName(DEFAULT_NAMES["bieg"]);
      setDescription("");
      setDay(selectedDay ?? "Poniedziałek");
      setPlannedTime("");
      setReminderEnabled(true);
      setWarmup("");
      setMainStage("");
      setCooldown("");
      setStagesOpen(true);
    }
  }, [isOpen, editWorkout, selectedDay]);

  const handleTypeChange = (newType: WorkoutType) => {
    setType(newType);
    if (!isEditing && Object.values(DEFAULT_NAMES).includes(name)) {
      setName(DEFAULT_NAMES[newType]);
    }
    if (RUNNING_TYPES.has(newType)) {
      setStagesOpen(true);
    }
  };

  const isRunning = RUNNING_TYPES.has(type);
  const hasStages = !!(warmup || mainStage || cooldown);
  const showStages = isRunning || hasStages;

  const buildData = (): Omit<Workout, "id" | "completed"> => ({
    day: (isEditing ? editWorkout!.day : selectedDay) ?? day,
    type,
    name: name.trim(),
    description: description.trim() || undefined,
    plannedTime: plannedTime || undefined,
    reminderEnabled: remindersEnabled ? reminderEnabled : undefined,
    warmup: isRunning ? (warmup.trim() || undefined) : undefined,
    mainStage: isRunning ? (mainStage.trim() || undefined) : undefined,
    cooldown: isRunning ? (cooldown.trim() || undefined) : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isEditing && onSave && editWorkout) {
      onSave(editWorkout.id, buildData());
    } else {
      onAdd(buildData());
    }
    onClose();
  };

  const dialogTitle = isEditing
    ? "Edytuj trening"
    : unplanned
    ? "Niezaplanowany trening"
    : `Dodaj trening${selectedDay ? ` — ${selectedDay}` : ""}`;

  const dialogDescription = isEditing
    ? "Zmień szczegóły zaplanowanego treningu."
    : unplanned
    ? "Zapisz aktywność, którą właśnie wykonałaś."
    : "Wypełnij szczegóły planowanego treningu.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {(unplanned || isEditing) && (
            <div className="space-y-2">
              <Label htmlFor="day">Dzień tygodnia</Label>
              <Select value={isEditing ? editWorkout!.day : day} onValueChange={(val) => setDay(val as DayOfWeek)} disabled={isEditing}>
                <SelectTrigger id="day">
                  <SelectValue placeholder="Wybierz dzień" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Typ treningu</Label>
            <Select value={type} onValueChange={(val) => handleTypeChange(val as WorkoutType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Wybierz typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bieg">Bieg</SelectItem>
                <SelectItem value="bieg_latwy">Bieg łatwy</SelectItem>
                <SelectItem value="bieg_dlugi">Bieg długi</SelectItem>
                <SelectItem value="bieg_jakosciowy">Bieg jakościowy</SelectItem>
                <SelectItem value="zabawa_biegowa">Zabawa biegowa</SelectItem>
                <SelectItem value="siła">Siła</SelectItem>
                <SelectItem value="joga">Joga</SelectItem>
                <SelectItem value="rozciaganie">Rozciąganie</SelectItem>
                <SelectItem value="mobility">Mobility</SelectItem>
                <SelectItem value="rower">Rower</SelectItem>
                <SelectItem value="spacer">Spacer</SelectItem>
                <SelectItem value="relaksacja">Relaksacja</SelectItem>
                <SelectItem value="inne">Inne</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nazwa</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Bieg 5 km"
              required
              autoFocus={isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Złożenie ćwiczeń, tempo, trasa..."
              className="resize-none h-16"
            />
          </div>

          {showStages && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/60">
              <button
                type="button"
                onClick={() => setStagesOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left"
              >
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Etapy treningu{" "}
                  <span className="font-normal text-gray-400 normal-case tracking-normal">(opcjonalnie)</span>
                </p>
                {stagesOpen
                  ? <ChevronUp size={14} className="text-gray-400 shrink-0" />
                  : <ChevronDown size={14} className="text-gray-400 shrink-0" />
                }
              </button>

              {stagesOpen && (
                <div className="px-3.5 pb-3.5 space-y-3 border-t border-gray-100 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="warmup" className="text-xs text-gray-600 font-medium">Rozgrzewka</Label>
                    <Textarea
                      id="warmup"
                      value={warmup}
                      onChange={(e) => setWarmup(e.target.value)}
                      placeholder="np. 10 min trucht, dynamiczna rozgrzewka…"
                      className="resize-none h-[56px] text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mainStage" className="text-xs text-gray-600 font-medium">Trening właściwy</Label>
                    <Textarea
                      id="mainStage"
                      value={mainStage}
                      onChange={(e) => setMainStage(e.target.value)}
                      placeholder="Opis tempa, interwały (np. 10×200 m z przerwą 60 s)…"
                      className="resize-none h-[68px] text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cooldown" className="text-xs text-gray-600 font-medium">Schłodzenie</Label>
                    <Textarea
                      id="cooldown"
                      value={cooldown}
                      onChange={(e) => setCooldown(e.target.value)}
                      placeholder="np. 5 min wolny trucht, rozciąganie…"
                      className="resize-none h-[56px] text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!unplanned && (
            <div className="space-y-2">
              <Label htmlFor="planned-time">
                Planowana godzina <span className="text-gray-400 font-normal">(opcjonalnie)</span>
              </Label>
              <Input
                id="planned-time"
                type="time"
                value={plannedTime}
                onChange={(e) => setPlannedTime(e.target.value)}
                className="w-32 h-9"
              />
              {plannedTime && remindersEnabled && (
                <p className="text-xs text-gray-400">Przypomnienie zostanie wysłane przed tą godziną.</p>
              )}
            </div>
          )}

          {remindersEnabled && (
            <div className="flex items-center justify-between py-1">
              <Label htmlFor="reminder-toggle" className="text-sm text-gray-700 cursor-pointer">
                Przypomnienie o tym treningu
              </Label>
              <Switch
                id="reminder-toggle"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
            <Button type="submit">
              {isEditing ? "Zapisz zmiany" : unplanned ? "Zapisz" : "Dodaj trening"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
