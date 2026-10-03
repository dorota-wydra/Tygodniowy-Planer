import { Workout, DayOfWeek, WorkoutType } from "../types/workout";

function getDayOfWeek(text: string): DayOfWeek | null {
  const l = text.toLowerCase().trim();
  if (l.startsWith("poniedziałek") || l.startsWith("poniedzialek")) return "Poniedziałek";
  if (l.startsWith("wtorek")) return "Wtorek";
  if (l.startsWith("środa") || l.startsWith("sroda")) return "Środa";
  if (l.startsWith("czwartek")) return "Czwartek";
  if (l.startsWith("piątek") || l.startsWith("piatek")) return "Piątek";
  if (l.startsWith("sobota")) return "Sobota";
  if (l.startsWith("niedziela")) return "Niedziela";
  return null;
}

function getWorkoutType(text: string): WorkoutType | "skip" {
  const l = text.toLowerCase();
  if (l.includes("wolne") || l.includes("odpoczynek") || l.includes("rest")) return "skip";
  if (l.includes("joga") || l.includes("yoga")) return "joga";
  if (l.includes("mobility")) return "mobility";
  if (l.includes("rozciąg") || l.includes("rozciag") || l.includes("stretching")) return "rozciaganie";
  if (l.includes("zabawa bieg") || l.includes("bieg zabaw") || l.includes("fun run")) return "zabawa_biegowa";
  if (l.includes("bieg łatwy") || l.includes("bieg latwy") || l.includes("easy run") || l.includes("rozbieganie")) return "bieg_latwy";
  if (l.includes("bieg długi") || l.includes("bieg dlugi") || l.includes("long run")) return "bieg_dlugi";
  if (l.includes("bieg jakościowy") || l.includes("bieg jakosciowy") || l.includes("interwał") || l.includes("interwal") || l.includes("tempo run") || l.includes("fartlek")) return "bieg_jakosciowy";
  if (l.includes("bieg") || l.includes("run") || l.includes("jogging")) return "bieg";
  if (l.includes("rower") || l.includes("cycling") || l.includes("bike") || l.includes("jazda rower")) return "rower";
  if (l.includes("spacer") || l.includes("marsz") || l.includes("walk")) return "spacer";
  if (l.includes("siła") || l.includes("sila") || l.includes("siłow") || l.includes("silow") || l.includes("gym") || l.includes("wagi") || l.includes("weights")) return "siła";
  return "inne";
}

export function parseWorkoutText(text: string): Omit<Workout, "id" | "completed">[] {
  const lines = text.split("\n");
  const result: Omit<Workout, "id" | "completed">[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const day = getDayOfWeek(line);
    if (!day) continue;
    const sep = Math.max(line.indexOf(":"), line.indexOf("-"));
    if (sep === -1) continue;
    const content = line.substring(sep + 1).trim();
    if (!content) continue;
    const type = getWorkoutType(content);
    if (type === "skip") continue;
    result.push({ day, type, name: content });
  }

  return result;
}
