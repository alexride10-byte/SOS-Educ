// Taches de preparation : enregistrement + (re)programmation du rappel local.
import { cancelReminders, scheduleTaskReminder } from "./notifications";
import { tasksRepo } from "./storage";
import { Task, TaskStatus } from "@/src/types";

export async function saveTask(t: Task, previous?: Task | null): Promise<Task> {
  if (previous?.notificationId) await cancelReminders([previous.notificationId]);
  const notificationId = t.status === "done" ? undefined : await scheduleTaskReminder(t);
  const next: Task = { ...t, notificationId };
  await tasksRepo.save(next);
  return next;
}

export const setTaskStatus = (t: Task, status: TaskStatus) => saveTask({ ...t, status }, t);

export async function deleteTask(t: Task) {
  if (t.notificationId) await cancelReminders([t.notificationId]);
  await tasksRepo.remove(t.id);
}

// Preparations en attente (a faire / reportees), les plus urgentes d'abord
export function pendingTasks(list: Task[]): Task[] {
  return list
    .filter((t) => t.status !== "done")
    .sort((a, b) => `${a.dueDate ?? "9999"}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate ?? "9999"}${b.dueTime ?? ""}`));
}
