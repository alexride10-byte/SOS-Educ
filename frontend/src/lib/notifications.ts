// Notifications locales pour les rendez-vous.
// 4 rappels: T-1h, T-30min, T-25min, T-5min.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { AgendaEvent, DEFAULT_REMINDERS, Task } from "@/src/types";
import { computeDeparture, parseLocal } from "./time";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === "granted";
}

function eventLabel(e: AgendaEvent) {
  return e.childCode ? `[${e.childCode}] ${e.title}` : e.title;
}

// Rappels configurables : T-1h, T-30min, heure de depart calculee, T-5min (facultatif).
// Deux rappels tombant a la meme minute sont fusionnes (le rappel de depart est prioritaire).
export async function scheduleEventReminders(e: AgendaEvent): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const prefs = e.reminders ?? DEFAULT_REMINDERS;
  if (!prefs.h1 && !prefs.m30 && !prefs.departure && !prefs.m5) return [];
  const ok = await requestNotifPermission();
  if (!ok) return [];

  const base = parseLocal(e.date, e.time);
  const departure = computeDeparture(e.time, e.travelMin, e.bufferMin);
  const label = eventLabel(e);
  const byMinute = new Map<number, { title: string; body: string }>();
  if (prefs.h1) byMinute.set(60, { title: `RDV dans 1 h : ${label}`, body: `${e.time} - ${e.location || "lieu non precise"}` });
  if (prefs.m30) byMinute.set(30, { title: `Preparation : ${label}`, body: `RDV a ${e.time}, depart conseille a ${departure}` });
  if (prefs.m5) byMinute.set(5, { title: `Rappel final : ${label}`, body: `Debut dans 5 min` });
  if (prefs.departure) {
    byMinute.set((e.travelMin || 0) + (e.bufferMin || 0), {
      title: `Heure de depart : ${label}`,
      body: `Partez maintenant (trajet ${e.travelMin} min + marge ${e.bufferMin} min, RDV a ${e.time})`,
    });
  }

  const ids: string[] = [];
  for (const [minsBefore, content] of byMinute) {
    const trigger = new Date(base.getTime() - minsBefore * 60 * 1000);
    if (trigger.getTime() <= Date.now() + 1000) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    ids.push(id);
  }
  return ids;
}

export async function scheduleTaskReminder(t: Task): Promise<string | undefined> {
  if (Platform.OS === "web" || t.status === "done" || !t.reminderDate || !t.reminderTime) return undefined;
  const at = parseLocal(t.reminderDate, t.reminderTime);
  if (at.getTime() <= Date.now() + 1000) return undefined;
  if (!(await requestNotifPermission())) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title: "A preparer", body: t.title },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
}

export async function cancelReminders(ids?: string[]) {
  if (!ids || Platform.OS === "web") return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}
