import { Workout, WorkoutType, INTENSITY_CONFIG } from "../types/workout";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Mic, Loader2, GripVertical, Clock, MinusCircle, CornerUpLeft, XCircle, AlertCircle, Pencil, MoreVertical, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface WorkoutCardProps {
  workout: Workout;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onSkip?: (id: string) => void;
  onMissed?: (id: string, reason: string | null) => void;
  onEdit?: (workout: Workout) => void;
  /** When true the card is rendered as a drag overlay (no interactions) */
  isDragOverlay?: boolean;
}

export const TYPE_CONFIG: Record<WorkoutType, { label: string; badgeCls: string; borderCls: string }> = {
  bieg:             { label: "Bieg",             badgeCls: "bg-red-100 text-red-700",         borderCls: "border-l-red-400" },
  bieg_latwy:       { label: "Bieg łatwy",       badgeCls: "bg-red-50 text-red-500",           borderCls: "border-l-red-300" },
  bieg_dlugi:       { label: "Bieg długi",       badgeCls: "bg-red-100 text-red-800",          borderCls: "border-l-red-500" },
  bieg_jakosciowy:  { label: "Bieg jakościowy",  badgeCls: "bg-rose-100 text-rose-800",        borderCls: "border-l-rose-600" },
  siła:             { label: "Siła",             badgeCls: "bg-gray-900 text-white",           borderCls: "border-l-gray-800" },
  joga:             { label: "Joga",             badgeCls: "bg-green-100 text-green-700",      borderCls: "border-l-green-500" },
  rozciaganie:      { label: "Rozciąganie",      badgeCls: "bg-lime-100 text-lime-700",        borderCls: "border-l-lime-400" },
  mobility:         { label: "Mobility",         badgeCls: "bg-cyan-100 text-cyan-700",        borderCls: "border-l-cyan-500" },
  joga_rozciaganie: { label: "Joga/Rozciąganie", badgeCls: "bg-green-100 text-green-700",      borderCls: "border-l-green-500" },
  zabawa_biegowa:   { label: "Zabawa biegowa",   badgeCls: "bg-orange-100 text-orange-700",   borderCls: "border-l-orange-400" },
  rower:            { label: "Rower",            badgeCls: "bg-purple-100 text-purple-700",   borderCls: "border-l-purple-500" },
  spacer:           { label: "Spacer",           badgeCls: "bg-teal-100 text-teal-700",       borderCls: "border-l-teal-400" },
  relaksacja:       { label: "Relaksacja",       badgeCls: "bg-sky-100 text-sky-700",         borderCls: "border-l-sky-400" },
  inne:             { label: "Inne",             badgeCls: "bg-gray-100 text-gray-600",       borderCls: "border-l-gray-300" },
};

function useVoiceNote(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() =>
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );

  const startListening = () => {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
      start: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "pl-PL";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };
    recognition.start();
  };

  return { isListening, isSupported, startListening };
}

export function WorkoutCard({ workout, onToggleComplete, onDelete, onUpdateNotes, onSkip, onMissed, onEdit, isDragOverlay }: WorkoutCardProps) {
  const [showNotes, setShowNotes] = useState(!!workout.notes);
  const [showMissedForm, setShowMissedForm] = useState(false);
  const [missedDraft, setMissedDraft] = useState("");
  const [nameExpanded, setNameExpanded] = useState(false);

  const config = TYPE_CONFIG[workout.type] ?? TYPE_CONFIG["inne"];
  const isMissed = !!workout.missed;
  const isSkipped = !!workout.skipped;
  const isInactive = isMissed || isSkipped;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: workout.id,
    data: { day: workout.day },
    disabled: isDragOverlay || isInactive,
  });

  const style = transform && !isDragOverlay
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const { isListening, isSupported, startListening } = useVoiceNote((transcript) => {
    const current = workout.notes ? workout.notes + " " : "";
    onUpdateNotes(workout.id, current + transcript);
    setShowNotes(true);
  });

  const handleMarkMissed = () => {
    onMissed?.(workout.id, missedDraft);
    setShowMissedForm(false);
    setMissedDraft("");
  };

  const handleUndoMissed = () => {
    onMissed?.(workout.id, null);
  };

  // Border colour override for missed state
  const borderClass = isMissed ? "border-l-red-400" : config.borderCls;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!isDragging && !isDragOverlay}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isDragging ? 0 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`relative rounded-xl border-l-4 shadow-sm transition-shadow ${borderClass} ${
        isMissed ? "bg-red-50/40 opacity-75" :
        isSkipped ? "bg-white opacity-50 grayscale" :
        workout.completed ? "bg-white opacity-60" : "bg-white"
      } ${isDragOverlay ? "shadow-xl opacity-95 rotate-1 scale-[1.02]" : "hover:shadow-md"} ${
        isDragging ? "opacity-0" : ""
      }`}
    >
      <div className="flex items-start gap-3 p-3.5">
        {/* Drag handle */}
        {!isDragOverlay && !isInactive && (
          <button
            {...listeners}
            {...attributes}
            className="touch-none mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 p-0.5 -ml-1 transition-colors"
            aria-label="Przeciągnij trening"
            tabIndex={-1}
          >
            <GripVertical size={16} />
          </button>
        )}
        {isInactive && !isDragOverlay && <div className="w-4 shrink-0 -ml-1" />}

        {/* Status indicator */}
        {!isMissed && !isSkipped ? (
          <Checkbox
            id={`workout-${workout.id}`}
            checked={workout.completed}
            onCheckedChange={(checked) => !isDragOverlay && onToggleComplete(workout.id, !!checked)}
            className="mt-0.5 shrink-0"
          />
        ) : isMissed ? (
          <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
        ) : null}

        {/* Content — full width */}
        <div className="flex-1 min-w-0">
          <Badge className={`text-[10px] px-1.5 py-0 rounded-full font-semibold border-0 mb-1 inline-flex shrink-0 ${config.badgeCls}`}>
            {config.label}
          </Badge>

          {/* ── Name row: label (checkbox tap target) + expand toggle ── */}
          <div className="flex items-start gap-0.5">
            <label
              htmlFor={isInactive ? undefined : `workout-${workout.id}`}
              className={`flex-1 min-w-0 text-sm font-semibold leading-snug ${nameExpanded ? "" : "line-clamp-2"} ${
                isMissed ? "line-through text-red-400" :
                isSkipped ? "line-through text-gray-400" :
                workout.completed ? "line-through text-gray-400 cursor-pointer" :
                "text-gray-900 cursor-pointer"
              }`}
            >
              {workout.name}
            </label>
            <button
              onClick={() => setNameExpanded((v) => !v)}
              className="shrink-0 mt-0.5 text-gray-300 hover:text-primary transition-colors p-0.5 -mr-0.5"
              aria-label={nameExpanded ? "Zwiń nazwę" : "Rozwiń nazwę"}
            >
              {nameExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>

          {/* ── Meta row ── */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {workout.plannedTime && !isInactive && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Clock size={10} />{workout.plannedTime}
              </span>
            )}
            {workout.movedFrom && !isInactive && (
              <span className="flex items-center gap-0.5 text-xs text-blue-400">
                <CornerUpLeft size={10} />z {workout.movedFrom}
              </span>
            )}
            {isMissed && (
              <span className="text-xs text-red-400 italic font-medium">nie odbył się</span>
            )}
            {isSkipped && !isMissed && (
              <span className="text-xs text-gray-400 italic">pominięty</span>
            )}
          </div>

          {/* Description */}
          {workout.description && !isInactive && (
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{workout.description}</p>
          )}

          {/* Training stages (running workouts) */}
          {(workout.warmup || workout.mainStage || workout.cooldown) && !isInactive && (
            <div className="mt-1.5 space-y-0.5">
              {workout.warmup && (
                <p className="text-xs text-gray-600 leading-snug">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Rozgrzewka·</span>
                  {workout.warmup}
                </p>
              )}
              {workout.mainStage && (
                <p className="text-xs text-gray-600 leading-snug">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Trening·</span>
                  {workout.mainStage}
                </p>
              )}
              {workout.cooldown && (
                <p className="text-xs text-gray-600 leading-snug">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mr-1">Schłodzenie·</span>
                  {workout.cooldown}
                </p>
              )}
            </div>
          )}

          {/* Plan metrics from program template */}
          {(workout.intensity || workout.distance || workout.duration || workout.reps || workout.pace || workout.heartRate || workout.weight) && !isInactive && (
            <div className="flex flex-wrap gap-1 mt-1">
              {workout.intensity && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${INTENSITY_CONFIG[workout.intensity].badgeCls}`}>
                  {INTENSITY_CONFIG[workout.intensity].label}
                </span>
              )}
              {[workout.distance, workout.duration, workout.reps, workout.pace, workout.heartRate, workout.weight].filter(Boolean).map((v, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{v}</span>
              ))}
            </div>
          )}
          {workout.customNotes && !isInactive && (
            <p className="text-xs text-gray-400 mt-0.5 italic leading-snug">{workout.customNotes}</p>
          )}

          {/* Missed reason */}
          {isMissed && workout.missedReason && (
            <p className="text-xs text-red-500/80 mt-1 italic leading-snug">
              „{workout.missedReason}"
            </p>
          )}

          {/* Undo missed */}
          {isMissed && !isDragOverlay && (
            <button
              onClick={handleUndoMissed}
              className="text-xs text-gray-400 hover:text-gray-600 underline mt-1"
            >
              Cofnij oznaczenie
            </button>
          )}

          {/* Notes textarea */}
          {!isDragOverlay && !isInactive && (
            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Textarea
                    value={workout.notes ?? ""}
                    onChange={(e) => onUpdateNotes(workout.id, e.target.value)}
                    placeholder="Notatka do treningu..."
                    className="mt-2 text-xs resize-none h-16 bg-gray-50 border-gray-100 focus:bg-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Missed inline form */}
          <AnimatePresence>
            {showMissedForm && !isDragOverlay && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={missedDraft}
                    onChange={(e) => setMissedDraft(e.target.value)}
                    placeholder="Co przeszkodziło? (opcjonalnie — kontuzja, choroba, inna przyczyna...)"
                    className="resize-none h-14 text-xs bg-red-50/50 border-red-100 focus:bg-white"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkMissed}
                      className="text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-full font-semibold transition-colors"
                    >
                      <AlertCircle size={10} className="inline mr-1" />Oznacz jako niewykonany
                    </button>
                    <button
                      onClick={() => { setShowMissedForm(false); setMissedDraft(""); }}
                      className="text-xs text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions — three-dot dropdown */}
        {!isDragOverlay && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 -mr-1 ml-0.5 self-start mt-0.5">
                {isListening ? <Loader2 size={15} className="animate-spin text-red-500" /> : <MoreVertical size={15} />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[170px]">
              {isSkipped ? (
                <DropdownMenuItem onClick={() => onSkip?.(workout.id)}>
                  <CornerUpLeft size={14} className="mr-2 text-primary" /> Cofnij pominięcie
                </DropdownMenuItem>
              ) : isMissed ? (
                <DropdownMenuItem onClick={() => onDelete(workout.id)} className="text-red-600 focus:text-red-600">
                  <Trash2 size={14} className="mr-2" /> Usuń
                </DropdownMenuItem>
              ) : (
                <>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(workout)}>
                      <Pencil size={14} className="mr-2 text-gray-500" /> Edytuj
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowNotes((s) => !s)}>
                    <FileText size={14} className="mr-2 text-gray-500" /> {showNotes ? "Ukryj notatkę" : "Notatka"}
                  </DropdownMenuItem>
                  {isSupported && (
                    <DropdownMenuItem onClick={startListening}>
                      <Mic size={14} className="mr-2 text-gray-500" /> Dyktuj notatkę
                    </DropdownMenuItem>
                  )}
                  {onMissed && <DropdownMenuSeparator />}
                  {onMissed && (
                    <DropdownMenuItem onClick={() => setShowMissedForm((v) => !v)} className="text-red-500 focus:text-red-600">
                      <XCircle size={14} className="mr-2" /> Nie odbył się
                    </DropdownMenuItem>
                  )}
                  {onSkip && (
                    <DropdownMenuItem onClick={() => onSkip(workout.id)} className="text-amber-600 focus:text-amber-700">
                      <MinusCircle size={14} className="mr-2" /> Pomiń
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(workout.id)} className="text-red-600 focus:text-red-600">
                    <Trash2 size={14} className="mr-2" /> Usuń
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}
