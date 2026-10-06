// Notifications locales pour les rendez-vous.
// 4 rappels: T-1h, T-30min, T-25min, T-5min.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { AgendaEvent } from "@/src/types";

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

function parseEventDate(e: AgendaEvent): Date {
  const [h, m] = e.time.split(":").map((x) => parseInt(x, 10));
  const d = new Date(e.date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export async function scheduleEventReminders(e: AgendaEvent): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const ok = await requestNotifPermission();
  if (!ok) return [];

  const base = parseEventDate(e);
  const offsets: { minsBefore: number; title: string; body: string }[] = [
    { minsBefore: 60, title: `RDV dans 1h: ${e.title}`, body: `${e.childName} - ${e.location}` },
    { minsBefore: 30, title: "Preparation (30 min)", body: `${e.title} a ${e.time}` },
    { minsBefore: 25, title: "Depart imminent", body: `Trajet estime ${e.travelMin} min` },
    { minsBefore: 5, title: "Rappel final", body: `${e.title} dans 5 min` },
  ];

  const ids: string[] = [];
  for (const o of offsets) {
    const trigger = new Date(base.getTime() - o.minsBefore * 60 * 1000);
    if (trigger.getTime() <= Date.now() + 1000) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: o.title, body: o.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelReminders(ids?: string[]) {
  if (!ids || Platform.OS === "web") return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}
