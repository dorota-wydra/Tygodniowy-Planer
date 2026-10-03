import type { SyncState } from "../types/appData";
import { Wifi, WifiOff, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncStatusProps {
  sync: SyncState;
  isAuthenticated: boolean;
  onSyncNow: () => void;
}

export function SyncStatus({ sync, isAuthenticated, onSyncNow }: SyncStatusProps) {
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <WifiOff size={12} />
        <span>Tryb offline — dane lokalne</span>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    idle:     { icon: <CheckCircle2 size={12} />, text: "Zapisano lokalnie",         cls: "text-gray-400" },
    saving:   { icon: <Loader2 size={12} className="animate-spin" />, text: "Zapisuję…", cls: "text-gray-400" },
    saved:    { icon: <CheckCircle2 size={12} />, text: "Zapisano",                  cls: "text-gray-400" },
    syncing:  { icon: <Loader2 size={12} className="animate-spin" />, text: "Synchronizowanie…", cls: "text-blue-500" },
    synced:   { icon: <Wifi size={12} />,         text: "Zsynchronizowano",          cls: "text-green-600" },
    offline:  { icon: <WifiOff size={12} />,      text: "Offline — zapisano lokalnie", cls: "text-amber-500" },
    error:    { icon: <AlertCircle size={12} />,  text: "Błąd synchronizacji",       cls: "text-red-500" },
    conflict: { icon: <AlertCircle size={12} />,  text: "Konflikt danych",            cls: "text-orange-500" },
  };

  const cfg = statusConfig[sync.status] ?? statusConfig.idle;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className={`flex items-center gap-1.5 text-xs ${cfg.cls}`}>
        {cfg.icon}
        <span>{cfg.text}</span>
      </div>
      {(sync.status === "error" || sync.status === "offline" || sync.pendingSync) && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onSyncNow}
          className="h-6 px-2 text-xs text-gray-500 hover:text-primary"
        >
          <RefreshCw size={11} className="mr-1" />
          Synchronizuj teraz
        </Button>
      )}
      {sync.lastSyncedAt && sync.status === "synced" && (
        <span className="text-xs text-gray-300">
          {new Date(sync.lastSyncedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
