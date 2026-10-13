// Plan des rappels d'un rendez-vous (logique pure, testee).
// Deux rappels tombant a la meme minute sont fusionnes : le rappel de depart est prioritaire.
import { computeDeparture } from "./time";
import { AgendaEvent, DEFAULT_REMINDERS, ReminderKind } from "@/src/types";

export interface PlannedReminder {
  kind: ReminderKind;
  minsBefore: number;
}

type PlanInput = Pick<AgendaEvent, "time" | "travelMin" | "bufferMin" | "reminders" | "status">;

export function planEventReminders(e: PlanInput): PlannedReminder[] {
  if (e.status !== "prevu") return [];
  const prefs = e.reminders ?? DEFAULT_REMINDERS;
  const byMinute = new Map<number, ReminderKind>();
  if (prefs.h1) byMinute.set(60, "h1");
  if (prefs.m30) byMinute.set(30, "m30");
  if (prefs.m5) byMinute.set(5, "m5");
  if (prefs.departure) byMinute.set(Math.max(0, (e.travelMin || 0) + (e.bufferMin || 0)), "departure");
  return [...byMinute.entries()].map(([minsBefore, kind]) => ({ kind, minsBefore })).sort((a, b) => b.minsBefore - a.minsBefore);
}

// Contenu volontairement discret (visible sur l'ecran verrouille) : motif du rappel + code, sans titre ni lieu.
export function reminderContent(kind: ReminderKind, e: Pick<AgendaEvent, "time" | "travelMin" | "bufferMin" | "childCode">) {
  const code = e.childCode ? ` [${e.childCode}]` : "";
  const departure = computeDeparture(e.time, e.travelMin, e.bufferMin);
  switch (kind) {
    case "h1":
      return { title: `Rendez-vous${code} dans 1 h`, body: `Départ conseillé à ${departure}. Ouvrez l'app pour le détail.` };
    case "m30":
      return { title: `Préparation${code} : rendez-vous dans 30 min`, body: `Départ conseillé à ${departure}.` };
    case "departure":
      return { title: `Heure de départ${code}`, body: `Partez maintenant pour le rendez-vous de ${e.time}.` };
    case "m5":
      return { title: `Rappel final${code} : rendez-vous dans 5 min`, body: "Ouvrez l'app pour le détail." };
  }
}
