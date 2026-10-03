import { useState, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReminderSettings, WorkoutType, DEFAULT_REMINDER_SETTINGS } from "../types/workout";
import { NotifPermission } from "../hooks/useReminders";
import { Bell, BellOff, BellRing, CheckCircle, Moon, Clock, XCircle, Info, Smartphone, Download, Upload, Database } from "lucide-react";
import { SyncStatus } from "../components/SyncStatus";
import type { SyncState } from "../types/appData";
import type { AppData } from "../types/appData";
import { migrateAppData } from "../data/migrations";
import { now } from "../data/defaultAppData";

const TYPE_LABELS: Record<WorkoutType, string> = {
  bieg: "Bieg", bieg_latwy: "Bieg łatwy", bieg_dlugi: "Bieg długi", bieg_jakosciowy: "Bieg jakościowy",
  siła: "Siła", joga: "Joga", rozciaganie: "Rozciąganie", mobility: "Mobility",
  joga_rozciaganie: "Joga/Rozciąganie",
  zabawa_biegowa: "Zabawa biegowa", rower: "Rower", spacer: "Spacer",
  relaksacja: "Relaksacja", inne: "Inne",
};

const ALL_TYPES: WorkoutType[] = [
  "bieg", "bieg_latwy", "bieg_dlugi", "bieg_jakosciowy",
  "siła", "joga", "rozciaganie", "mobility",
  "zabawa_biegowa", "rower", "spacer", "relaksacja", "inne",
];

interface SettingsTabProps {
  settings: ReminderSettings;
  onChange: (s: ReminderSettings) => void;
  permission: NotifPermission;
  onRequestPermission: () => void;
  sync: SyncState;
  isAuthenticated: boolean;
  onSyncNow: () => void;
  appData: AppData;
  onRestoreData: (data: AppData) => void;
}

function PermissionBadge({ permission }: { permission: NotifPermission }) {
  if (permission === "granted")
    return <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full font-medium"><CheckCircle size={11} /> Powiadomienia włączone</span>;
  if (permission === "denied")
    return <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium"><XCircle size={11} /> Zablokowane przez przeglądarkę</span>;
  if (permission === "unsupported")
    return <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium"><BellOff size={11} /> Nieobsługiwane</span>;
  return <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-medium"><BellRing size={11} /> Zgoda nie udzielona</span>;
}

// ─── Export / Import ──────────────────────────────────────────────────────────

interface ImportPreview {
  data: AppData;
  workoutsCount: number;
  historyCount: number;
  notesCount: number;
  programName: string | null;
  exportedAt: string;
}

export function BackupSection({
  appData,
  onRestoreData,
}: {
  appData: AppData;
  onRestoreData: (data: AppData) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importConfirming, setImportConfirming] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const handleExport = () => {
    const payload = {
      schemaVersion: appData.schemaVersion,
      exportedAt: now(),
      data: appData,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `planer-treningow-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportPreview(null);
    setImportDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        // Accept both {data: AppData, exportedAt} and raw AppData
        const dataRaw = raw?.data ?? raw;
        const exportedAt = raw?.exportedAt ?? "—";
        const migrated = migrateAppData(dataRaw);
        setImportPreview({
          data: migrated,
          workoutsCount: migrated.currentWeek.workouts.length,
          historyCount: migrated.history.length,
          notesCount: migrated.notes.length,
          programName: migrated.trainingProgram?.name ?? null,
          exportedAt,
        });
        setImportConfirming(true);
      } catch {
        setImportError("Nie udało się odczytać pliku. Upewnij się, że to prawidłowy plik kopii zapasowej.");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    onRestoreData({ ...importPreview.data, updatedAt: now() });
    setImportConfirming(false);
    setImportPreview(null);
    setImportDone(true);
  };

  const handleCancelImport = () => {
    setImportConfirming(false);
    setImportPreview(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Database size={15} className="text-primary" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dane i kopia zapasowa</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
          <Download size={13} /> Eksportuj dane
        </Button>
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 text-xs">
          <Upload size={13} /> Importuj kopię
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      </div>

      <p className="text-xs text-gray-400">
        Eksport tworzy plik JSON z wszystkimi danymi aplikacji. Import zastępuje bieżące dane zwalidowaną kopią.
      </p>

      {importError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
          {importError}
        </div>
      )}

      {importDone && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 font-medium">
          ✓ Import zakończony pomyślnie.
        </div>
      )}

      {importConfirming && importPreview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-amber-800">Podgląd importu</p>
          <div className="text-xs text-amber-700 space-y-1">
            <p>Eksportowano: <strong>{importPreview.exportedAt}</strong></p>
            <p>Treningi w bieżącym tygodniu: <strong>{importPreview.workoutsCount}</strong></p>
            <p>Tygodnie w historii: <strong>{importPreview.historyCount}</strong></p>
            <p>Notatki: <strong>{importPreview.notesCount}</strong></p>
            {importPreview.programName && <p>Program: <strong>{importPreview.programName}</strong></p>}
          </div>
          <p className="text-xs text-amber-700 font-semibold">
            Ta operacja zastąpi bieżące dane. Aktualne dane zostaną zachowane jako kopia zapasowa w localStorage.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirmImport} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              Potwierdź import
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelImport} className="text-xs">
              Anuluj
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main SettingsTab ─────────────────────────────────────────────────────────

export function SettingsTab({
  settings, onChange, permission, onRequestPermission,
  sync, isAuthenticated, onSyncNow, appData, onRestoreData,
}: SettingsTabProps) {
  const [showPwaInfo, setShowPwaInfo] = useState(false);
  const update = (patch: Partial<ReminderSettings>) => onChange({ ...settings, ...patch });
  const toggleType = (type: WorkoutType) => {
    const disabled = settings.disabledTypes.includes(type)
      ? settings.disabledTypes.filter((t) => t !== type)
      : [...settings.disabledTypes, type];
    update({ disabledTypes: disabled });
  };

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h3 className="font-bold text-gray-900">Ustawienia</h3>
        <p className="text-xs text-gray-400 mt-0.5">Przypomnienia i synchronizacja</p>
      </div>

      {/* ── Sync status ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <SyncStatus sync={sync} isAuthenticated={isAuthenticated} onSyncNow={onSyncNow} />
      </div>

      {/* ── Notifications permission ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-primary" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Powiadomienia systemowe</p>
        </div>
        <div className="flex items-center justify-between">
          <PermissionBadge permission={permission} />
          {permission === "default" && (
            <Button size="sm" variant="outline" onClick={onRequestPermission} className="text-xs h-8">Włącz powiadomienia</Button>
          )}
          {permission === "denied" && (
            <span className="text-xs text-gray-400">Odblokuj w ustawieniach przeglądarki</span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Powiadomienia systemowe działają, gdy aplikacja jest otwarta. Dla najlepszego efektu dodaj aplikację do ekranu głównego telefonu.
        </p>
        <button onClick={() => setShowPwaInfo((v) => !v)} className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
          <Smartphone size={12} />{showPwaInfo ? "Ukryj" : "Jak dodać do ekranu głównego?"}
        </button>
        {showPwaInfo && (
          <div className="bg-blue-50 rounded-xl p-3 space-y-2 text-xs text-blue-800">
            <p><strong>iOS (Safari):</strong> Dotknij ikony udostępniania → „Dodaj do ekranu głównego"</p>
            <p><strong>Android (Chrome):</strong> Menu → „Dodaj do ekranu głównego" lub baner instalacji</p>
            <p className="text-blue-600">Po dodaniu do ekranu aplikacja działa jak natywna i lepiej obsługuje powiadomienia.</p>
          </div>
        )}
      </div>

      {/* ── Reminders ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing size={15} className="text-primary" />
            <div>
              <Label htmlFor="reminders-toggle" className="text-sm font-semibold text-gray-900 cursor-pointer">Włącz przypomnienia</Label>
              <p className="text-xs text-gray-400 mt-0.5">Przypomnienia o zaplanowanych treningach</p>
            </div>
          </div>
          <Switch id="reminders-toggle" checked={settings.remindersEnabled} onCheckedChange={(v) => update({ remindersEnabled: v })} />
        </div>

        {settings.remindersEnabled && (
          <div className="space-y-5 border-t border-gray-100 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400" /><Label className="text-sm font-medium text-gray-700">Domyślna godzina przypomnienia</Label></div>
              <p className="text-xs text-gray-400">Dla treningów bez ustawionej godziny</p>
              <Input type="time" value={settings.defaultReminderTime} onChange={(e) => update({ defaultReminderTime: e.target.value })} className="w-32 h-9" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Wyprzedzenie przed treningiem</Label>
              <p className="text-xs text-gray-400">Ile minut wcześniej przypomnieć o treningu z ustawioną godziną</p>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} max={120} value={settings.defaultReminderOffsetMinutes} onChange={(e) => update({ defaultReminderOffsetMinutes: parseInt(e.target.value) || 0 })} className="w-20 h-9 text-center" />
                <span className="text-sm text-gray-500">minut</span>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon size={13} className="text-amber-500" />
                  <div>
                    <Label htmlFor="evening-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">Przypomnienie wieczorne</Label>
                    <p className="text-xs text-gray-400 mt-0.5">O niewykonanych treningach z możliwością działania</p>
                  </div>
                </div>
                <Switch id="evening-toggle" checked={settings.eveningReminderEnabled} onCheckedChange={(v) => update({ eveningReminderEnabled: v })} />
              </div>
              {settings.eveningReminderEnabled && (
                <div className="flex items-center gap-2 pl-5">
                  <span className="text-xs text-gray-500">Godzina:</span>
                  <Input type="time" value={settings.eveningReminderTime} onChange={(e) => update({ eveningReminderTime: e.target.value })} className="w-28 h-8 text-sm" />
                </div>
              )}
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Wyłącz przypomnienia dla typów</Label>
                <p className="text-xs text-gray-400 mt-0.5">Zaznaczone typy nie będą generować przypomnień</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_TYPES.map((type) => {
                  const disabled = settings.disabledTypes.includes(type);
                  return (
                    <button key={type} onClick={() => toggleType(type)} className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${disabled ? "bg-red-50 border-red-200 text-red-600 line-through" : "bg-gray-50 border-gray-200 text-gray-700 hover:border-primary hover:text-primary"}`}>
                      {TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
              {settings.disabledTypes.length > 0 && (
                <button onClick={() => update({ disabledTypes: [] })} className="text-xs text-gray-400 hover:text-gray-600 underline">Przywróć wszystkie</button>
              )}
            </div>
          </div>
        )}

        {!settings.remindersEnabled && (
          <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>Gdy włączysz przypomnienia, aplikacja będzie informować Cię o zaplanowanych treningach. Przypomnienia są wspierające — nie zawstydzające.</span>
          </div>
        )}
      </div>

      {/* ── Reset ────────────────────────────────────────────────────────── */}
      <div className="text-center">
        <button onClick={() => onChange({ ...DEFAULT_REMINDER_SETTINGS, remindersEnabled: settings.remindersEnabled })} className="text-xs text-gray-400 hover:text-gray-600 underline">
          Przywróć domyślne ustawienia przypomnień
        </button>
      </div>
    </div>
  );
}
