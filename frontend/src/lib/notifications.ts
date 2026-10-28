// Notifications locales pour les rendez-vous et preparations (plan des rappels : reminder-plan.ts).
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { AgendaEvent, ReminderKind, Task } from "@/src/types";
import { parseLocal } from "./time";
import { planEventReminders, reminderContent } from "./reminder-plan";

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

export const ALARM_CHANNEL = "rdv-alarms";
export const EVENT_CATEGORY = "rdv-alarm";
export const TASK_CATEGORY = "task-alarm";
const KINDS: ReminderKind[] = ["h1", "m30", "departure", "m5"];

// Canal Android sonore + vibration, contenu masque sur ecran verrouille selon les reglages,
// et boutons d'action "Arreter / Reporter 5 min / Traite". Ce sont des NOTIFICATIONS, pas des alarmes systeme.
export async function setupNotifications() {
  if (Platform.OS === "web") return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
        name: "Rappels de rendez-vous",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 400, 600, 400, 600],
        enableVibrate: true,
        sound: "default",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }
    const actions = (doneTitle: string) => [
      { identifier: "stop", buttonTitle: "Arrêter", options: { opensAppToForeground: false, isDestructive: true } },
      { identifier: "snooze", buttonTitle: "Reporter 5 min", options: { opensAppToForeground: true } },
      { identifier: "done", buttonTitle: doneTitle, options: { opensAppToForeground: true } },
    ];
    await Notifications.setNotificationCategoryAsync(EVENT_CATEGORY, actions("Traité"));
    await Notifications.setNotificationCategoryAsync(TASK_CATEGORY, actions("Terminée"));
  } catch {
    // categories non supportees (ex. Expo Go selon la plateforme) : les rappels restent simples
  }
}

export async function getNotifPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (Platform.OS === "web") return { granted: false, canAskAgain: false };
  const p = await Notifications.getPermissionsAsync();
  return { granted: p.status === "granted", canAskAgain: p.canAskAgain };
}

const eventReminderId = (eventId: string, kind: ReminderKind) => `rdv-${eventId}-${kind}`;

// Identifiants stables : reprogrammer remplace l'ancien rappel (pas de doublon).
export async function scheduleEventReminders(e: AgendaEvent): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const plan = planEventReminders(e);
  if (plan.length === 0) return [];
  if (!(await requestNotifPermission())) return [];

  const base = parseLocal(e.date, e.time);
  const ids: string[] = [];
  for (const { kind, minsBefore } of plan) {
    const date = new Date(base.getTime() - minsBefore * 60 * 1000);
    if (date.getTime() <= Date.now() + 1000) continue;
    const baseId = eventReminderId(e.id, kind);
    const id = await Notifications.scheduleNotificationAsync({
      identifier: baseId,
      content: {
        ...reminderContent(kind, e),
        data: { eventId: e.id, kind, baseId },
        categoryIdentifier: EVENT_CATEGORY,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: ALARM_CHANNEL },
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelEventReminders(e?: Pick<AgendaEvent, "id" | "notificationIds"> | null) {
  if (!e) return;
  const ids = [...(e.notificationIds ?? []), ...KINDS.flatMap((k) => [eventReminderId(e.id, k), `${eventReminderId(e.id, k)}-snooze`])];
  await cancelReminders(ids);
}

export async function scheduleTaskReminder(t: Task): Promise<string | undefined> {
  if (Platform.OS === "web" || t.status === "done" || !t.reminderDate || !t.reminderTime) return undefined;
  const at = parseLocal(t.reminderDate, t.reminderTime);
  if (at.getTime() <= Date.now() + 1000) return undefined;
  if (!(await requestNotifPermission())) return undefined;
  const baseId = `task-${t.id}`;
  return Notifications.scheduleNotificationAsync({
    identifier: baseId,
    content: {
      title: "À préparer",
      body: t.title,
      data: { taskId: t.id, baseId },
      categoryIdentifier: TASK_CATEGORY,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: ALARM_CHANNEL },
  });
}

export async function cancelTaskReminder(t?: Pick<Task, "id" | "notificationId"> | null) {
  if (!t) return;
  await cancelReminders([...(t.notificationId ? [t.notificationId] : []), `task-${t.id}`, `task-${t.id}-snooze`]);
}

// "Reporter 5 min" : un seul report actif par rappel (identifiant fixe).
export async function snoozeReminder(content: Notifications.NotificationContent) {
  const data = (content.data ?? {}) as { baseId?: string };
  if (!data.baseId) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `${data.baseId}-snooze`,
    content: {
      title: `Reporté : ${(content.title ?? "Rappel").replace(/^Reporté : /, "")}`,
      body: content.body ?? "",
      data: content.data,
      categoryIdentifier: content.categoryIdentifier ?? undefined,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 300, channelId: ALARM_CHANNEL },
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

export async function cancelAllReminders() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
