import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Play, Pause, RotateCcw, CheckCircle, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useLocalStorage } from "../hooks/useLocalStorage";

type Phase = "idle" | "warmup" | "exercise" | "rest" | "cooldown" | "done";

interface TimerConfig {
  exerciseTime: number;
  restTime: number;
  rounds: number;
  warmupMinutes: number;
  cooldownMinutes: number;
}

// ─── Audio helpers ────────────────────────────────────────────────────────
// All beeps use sine oscillators at low volume so they sit on top of music
// without interrupting the audio session.

function beep(ctx: AudioContext, freq: number, duration: number, volume: number) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch {}
}

// Short rising pip — played when a new phase STARTS
function phaseStartBeep(ctx: AudioContext) {
  beep(ctx, 880, 0.07, 0.18);
  setTimeout(() => beep(ctx, 1047, 0.07, 0.20), 90);
}

// Two short pips — played when the current phase ENDS
function phaseEndBeep(ctx: AudioContext) {
  beep(ctx, 660, 0.07, 0.18);
  setTimeout(() => beep(ctx, 660, 0.07, 0.18), 110);
}

// Single quiet tick — last 3 seconds countdown
function countdownBeep(ctx: AudioContext) {
  beep(ctx, 550, 0.05, 0.13);
}

// Triple ascending — training complete
function doneBeep(ctx: AudioContext) {
  beep(ctx, 880, 0.10, 0.22);
  setTimeout(() => beep(ctx, 1047, 0.10, 0.24), 160);
  setTimeout(() => beep(ctx, 1319, 0.18, 0.28), 320);
}

// ─── Wake Lock ────────────────────────────────────────────────────────────

type WakeLockSentinel = { release: () => Promise<void> };

function useWakeLock() {
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const [supported] = useState(() => "wakeLock" in navigator);

  const request = useCallback(async () => {
    if (!supported) return;
    try {
      const nav = navigator as Navigator & { wakeLock: { request: (t: string) => Promise<WakeLockSentinel> } };
      sentinel.current = await nav.wakeLock.request("screen");
    } catch {}
  }, [supported]);

  const release = useCallback(() => {
    if (sentinel.current) {
      sentinel.current.release().catch(() => {});
      sentinel.current = null;
    }
  }, []);

  return { supported, request, release };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

const PHASE_CONFIG: Record<Phase, { label: string; color: string; bg: string; ring: string }> = {
  idle:     { label: "Gotowy",       color: "text-gray-500",   bg: "bg-gray-100",    ring: "ring-gray-200" },
  warmup:   { label: "Rozgrzewka",   color: "text-amber-600",  bg: "bg-amber-50",    ring: "ring-amber-200" },
  exercise: { label: "Ćwiczenie",    color: "text-primary",    bg: "bg-primary/10",  ring: "ring-primary/30" },
  rest:     { label: "Przerwa",      color: "text-blue-600",   bg: "bg-blue-50",     ring: "ring-blue-200" },
  cooldown: { label: "Schłodzenie",  color: "text-teal-600",   bg: "bg-teal-50",     ring: "ring-teal-200" },
  done:     { label: "Koniec!",      color: "text-green-600",  bg: "bg-green-50",    ring: "ring-green-200" },
};

function NumInput({ label, value, onChange, min = 0, max = 999, unit }: {
  label: string; value: string | number; onChange: (v: string) => void;
  min?: number; max?: number; unit?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 text-center text-lg font-bold w-full"
        />
        {unit && <span className="text-xs text-gray-400 shrink-0 w-7">{unit}</span>}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function TimerTab() {
  const [exStr, setExStr] = useState("30");
  const [restStr, setRestStr] = useState("15");
  const [roundsStr, setRoundsStr] = useState("8");
  const [warmStr, setWarmStr] = useState("1");
  const [coolStr, setCoolStr] = useState("1");
  const [inputError, setInputError] = useState("");

  // Sound settings — persisted
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>("timer-sound-enabled", true);
  const [countdownEnabled, setCountdownEnabled] = useLocalStorage<boolean>("timer-countdown-enabled", true);

  const getCfg = (): TimerConfig | null => {
    const exerciseTime = parseInt(exStr) || 0;
    const restTime = parseInt(restStr) || 0;
    const rounds = parseInt(roundsStr) || 0;
    const warmupMinutes = parseInt(warmStr) || 0;
    const cooldownMinutes = parseInt(coolStr) || 0;
    if (exerciseTime < 1) { setInputError("Czas ćwiczenia musi wynosić co najmniej 1 sekundę."); return null; }
    if (rounds < 1) { setInputError("Liczba rund musi wynosić co najmniej 1."); return null; }
    setInputError("");
    return { exerciseTime, restTime, rounds, warmupMinutes, cooldownMinutes };
  };

  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [running, setRunning] = useState(false);
  const [cfg, setCfgState] = useState<TimerConfig | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const soundRef = useRef(soundEnabled);
  const countdownRef = useRef(countdownEnabled);
  soundRef.current = soundEnabled;
  countdownRef.current = countdownEnabled;

  const getAudio = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    if (audioCtx.current.state === "suspended") audioCtx.current.resume().catch(() => {});
    return audioCtx.current;
  }, []);

  const playStart = useCallback(() => {
    if (!soundRef.current) return;
    phaseStartBeep(getAudio());
  }, [getAudio]);

  const playEnd = useCallback(() => {
    if (!soundRef.current) return;
    phaseEndBeep(getAudio());
  }, [getAudio]);

  const playDone = useCallback(() => {
    if (!soundRef.current) return;
    doneBeep(getAudio());
  }, [getAudio]);

  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const phaseRef = useRef(phase);
  const roundRef = useRef(currentRound);
  const cfgRef = useRef(cfg);
  phaseRef.current = phase;
  roundRef.current = currentRound;
  cfgRef.current = cfg;

  const advance = useCallback(() => {
    const p = phaseRef.current;
    const r = roundRef.current;
    const c = cfgRef.current;
    if (!c) return;

    playEnd();

    if (p === "warmup") {
      setPhase("exercise");
      setTimeLeft(c.exerciseTime);
      setTimeout(playStart, 80);
    } else if (p === "exercise") {
      if (r < c.rounds) {
        if (c.restTime > 0) {
          setPhase("rest");
          setTimeLeft(c.restTime);
          setTimeout(playStart, 80);
        } else {
          setCurrentRound((prev) => prev + 1);
          setPhase("exercise");
          setTimeLeft(c.exerciseTime);
          setTimeout(playStart, 80);
        }
      } else {
        if (c.cooldownMinutes > 0) {
          setPhase("cooldown");
          setTimeLeft(c.cooldownMinutes * 60);
          setTimeout(playStart, 80);
        } else {
          setTimeout(playDone, 80);
          setPhase("done");
          setRunning(false);
          releaseWakeLock();
        }
      }
    } else if (p === "rest") {
      setCurrentRound((prev) => prev + 1);
      setPhase("exercise");
      setTimeLeft(c.exerciseTime);
      setTimeout(playStart, 80);
    } else if (p === "cooldown") {
      setTimeout(playDone, 80);
      setPhase("done");
      setRunning(false);
      releaseWakeLock();
    }
  }, [playEnd, playStart, playDone, releaseWakeLock]);

  const handleSkip = useCallback(() => advance(), [advance]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          advance();
          return 0;
        }
        // Countdown beep at 3, 2, 1
        if (prev <= 3 && countdownRef.current && soundRef.current) {
          countdownBeep(getAudio());
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, advance, getAudio]);

  const handleStart = () => {
    const c = getCfg();
    if (!c) return;
    setCfgState(c);
    cfgRef.current = c;
    setCurrentRound(1);
    if (c.warmupMinutes > 0) {
      setPhase("warmup");
      setTimeLeft(c.warmupMinutes * 60);
    } else {
      setPhase("exercise");
      setTimeLeft(c.exerciseTime);
    }
    playStart();
    setRunning(true);
    requestWakeLock();
  };

  const handlePause = () => setRunning(false);
  const handleResume = () => { setRunning(true); requestWakeLock(); };
  const handleReset = () => {
    setRunning(false);
    setPhase("idle");
    setTimeLeft(0);
    setCurrentRound(1);
    setCfgState(null);
    releaseWakeLock();
  };

  useEffect(() => () => releaseWakeLock(), [releaseWakeLock]);

  const pCfg = PHASE_CONFIG[phase];
  const isActive = phase !== "idle" && phase !== "done";
  const showRoundDots = isActive && phase !== "warmup" && phase !== "cooldown" && cfg;

  const totalSec = cfg
    ? cfg.warmupMinutes * 60 + cfg.rounds * (cfg.exerciseTime + (cfg.restTime > 0 ? cfg.restTime : 0)) - (cfg.restTime > 0 ? cfg.restTime : 0) + cfg.cooldownMinutes * 60
    : (parseInt(warmStr) || 0) * 60 + (parseInt(roundsStr) || 8) * ((parseInt(exStr) || 30) + (parseInt(restStr) || 15)) - (parseInt(restStr) || 15) + (parseInt(coolStr) || 0) * 60;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h3 className="font-bold text-gray-900">Timer do ćwiczeń</h3>
        <p className="text-xs text-gray-400 mt-0.5">Interwały, rundy, rozgrzewka i schłodzenie</p>
      </div>

      {/* Settings */}
      {phase === "idle" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ustawienia</p>

          <NumInput label="Rozgrzewka" value={warmStr} onChange={setWarmStr} min={0} max={60} unit="min" />

          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Ćwiczenie" value={exStr} onChange={setExStr} min={1} unit="sek" />
            <NumInput label="Przerwa" value={restStr} onChange={setRestStr} min={0} unit="sek" />
          </div>

          <NumInput label="Rundy" value={roundsStr} onChange={setRoundsStr} min={1} />

          <NumInput label="Schłodzenie" value={coolStr} onChange={setCoolStr} min={0} max={60} unit="min" />

          {inputError && <p className="text-xs text-red-500 font-medium">{inputError}</p>}

          <p className="text-xs text-gray-400">Łączny czas: <strong>{fmtTime(totalSec)}</strong></p>

          {/* ─── Sound settings ─── */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dźwięki</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Volume2 size={15} className="text-primary" /> : <VolumeX size={15} className="text-gray-400" />}
                <Label className="text-sm text-gray-700 cursor-pointer" htmlFor="sound-toggle">Sygnały dźwiękowe</Label>
              </div>
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>

            {soundEnabled && (
              <div className="flex items-center justify-between pl-6">
                <Label className="text-sm text-gray-500 cursor-pointer" htmlFor="countdown-toggle">
                  Odliczanie ostatnich 3 sekund
                </Label>
                <Switch
                  id="countdown-toggle"
                  checked={countdownEnabled}
                  onCheckedChange={setCountdownEnabled}
                />
              </div>
            )}

            {soundEnabled && (
              <p className="text-xs text-gray-400 pl-6">
                Krótkie, ciche sygnały — nie przerywają muzyki z innych aplikacji.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Active display */}
      {phase !== "idle" && (
        <div className={`rounded-2xl p-8 text-center transition-colors duration-500 ring-4 ${pCfg.bg} ${pCfg.ring}`}>
          {phase === "done" ? (
            <div className="space-y-3">
              <CheckCircle size={60} className="mx-auto text-green-500" />
              <p className="text-2xl font-black text-green-700">Świetna robota!</p>
              <p className="text-gray-500 text-sm">Trening zakończony. Brawo!</p>
            </div>
          ) : (
            <>
              <p className={`text-sm font-bold uppercase tracking-widest ${pCfg.color}`}>{pCfg.label}</p>
              {(phase === "exercise" || phase === "rest") && cfg && (
                <p className="text-xs text-gray-500 mt-1">Runda {currentRound} / {cfg.rounds}</p>
              )}
              {(phase === "warmup" || phase === "cooldown") && (
                <p className="text-xs text-gray-400 mt-1">&nbsp;</p>
              )}
              <p className={`text-8xl font-black tabular-nums leading-none mt-3 ${timeLeft <= 3 && timeLeft > 0 ? "animate-pulse" : ""} ${pCfg.color}`}>
                {fmtTime(timeLeft)}
              </p>
              {phase === "exercise" && cfg && (
                <p className="text-xs text-gray-400 mt-3">
                  Następnie: {currentRound < cfg.rounds ? "przerwa" : cfg.cooldownMinutes > 0 ? "schłodzenie" : "koniec"}
                </p>
              )}
              {!soundEnabled && (
                <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <VolumeX size={11} /> dźwięki wyłączone
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Round dots */}
      {showRoundDots && (
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: cfg!.rounds }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i < currentRound - 1 ? "bg-primary" :
              i === currentRound - 1 ? "bg-primary ring-2 ring-primary/30 scale-125" :
              "bg-gray-200"
            }`} />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {phase === "idle" && (
          <Button size="lg" onClick={handleStart} className="flex-1 h-14 text-base gap-2 max-w-xs">
            <Play size={20} /> Start
          </Button>
        )}

        {isActive && running && (
          <Button size="lg" variant="outline" onClick={handlePause} className="flex-1 h-14 text-base gap-2 max-w-xs">
            <Pause size={20} /> Pauza
          </Button>
        )}

        {isActive && !running && (
          <Button size="lg" onClick={handleResume} className="flex-1 h-14 text-base gap-2 max-w-xs">
            <Play size={20} /> Wznów
          </Button>
        )}

        {isActive && (
          <Button size="lg" variant="outline" onClick={handleSkip} className="h-14 px-4 text-gray-500 gap-1.5" title="Pomiń etap">
            <SkipForward size={18} />
          </Button>
        )}

        {phase !== "idle" && (
          <Button size="lg" variant="outline" onClick={handleReset} className="h-14 w-14 p-0 text-gray-400">
            <RotateCcw size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
