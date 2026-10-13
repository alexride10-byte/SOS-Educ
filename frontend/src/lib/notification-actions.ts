// Traitement des boutons des rappels : Arreter, Reporter 5 min, Traite / Terminee, ou ouverture.
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { cancelReminders, snoozeReminder } from "./notifications";
import { eventsRepo, tasksRepo } from "./storage";
import { setTaskStatus } from "./tasks";
import { ReminderKind } from "@/src/types";

async function handle(r: Notifications.NotificationResponse) {
  const req = r.notification.request;
  const data = (req.content.data ?? {}) as { eventId?: string; taskId?: string; kind?: ReminderKind; baseId?: string };
  const action = r.actionIdentifier;
  try {
    if (action === "stop") {
      await Notifications.dismissNotificationAsync(req.identifier);
    } else if (action === "snooze") {
      await Notifications.dismissNotificationAsync(req.identifier);
      await snoozeReminder(req.content);
    } else if (action === "done") {
      await Notifications.dismissNotificationAsync(req.identifier);
      if (data.baseId) await cancelReminders([`${data.baseId}-snooze`]);
      if (data.taskId) {
        const t = (await tasksRepo.list()).find((x) => x.id === data.taskId);
        if (t) await setTaskStatus(t, "done");
      }
      if (data.eventId && data.kind) {
        const ev = (await eventsRepo.list()).find((x) => x.id === data.eventId);
        if (ev) await eventsRepo.save({ ...ev, handledReminders: [...new Set([...(ev.handledReminders ?? []), data.kind])] });
      }
    } else if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push("/(tabs)/agenda");
    }
  } catch {
    // ne jamais bloquer l'app sur une action de rappel
  }
}

export function NotificationActions() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    // Action effectuee pendant que l'app etait fermee : traitee au prochain lancement
    Notifications.getLastNotificationResponseAsync().then(async (r) => {
      if (!r) return;
      await handle(r);
      await Notifications.clearLastNotificationResponseAsync?.();
    });
    return () => sub.remove();
  }, []);
  return null;
}
