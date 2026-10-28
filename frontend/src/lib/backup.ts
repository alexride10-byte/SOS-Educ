// Sauvegarde / restauration de toutes les donnees locales, justificatifs compris (fichier JSON).
// Le fichier contient des donnees sensibles : a conserver dans un emplacement maitrise.
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";

import { clearPhotos, photoDataUri, restorePhoto } from "./photo-store";
import { cancelAllReminders, scheduleEventReminders } from "./notifications";
import { saveTask } from "./tasks";
import { clearAll, eventsRepo, expensesRepo, KEYS, kv, replaceAll, sessionsRepo, tasksRepo } from "./storage";
import { localIso } from "./time";
import { AgendaEvent, Expense, Session, Task } from "@/src/types";

const FORMAT = "caresync-backup";

interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  sessions: Session[];
  expenses: Expense[];
  events: AgendaEvent[];
  tasks: Task[];
  childColors: Record<string, string>;
  photos?: Record<string, string>; // uri d'origine -> image (data URI)
}

export async function buildBackup(): Promise<Backup> {
  const expenses = await expensesRepo.list();
  const photos: Record<string, string> = {};
  for (const e of expenses) {
    for (const uri of [e.photoUri, e.originalPhotoUri]) {
      if (uri && !photos[uri]) {
        const data = await photoDataUri(uri);
        if (data) photos[uri] = data;
      }
    }
  }
  return {
    format: FORMAT,
    version: 3,
    exportedAt: new Date().toISOString(),
    sessions: await sessionsRepo.list(),
    expenses,
    events: await eventsRepo.list(),
    tasks: await tasksRepo.list(),
    childColors: await kv.get(KEYS.childColors, {}),
    photos,
  };
}

export async function exportBackup(): Promise<boolean> {
  const payload = JSON.stringify(await buildBackup());
  const name = `caresync-sauvegarde-${localIso()}.json`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(payload);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Sauvegarde CareSync" });
  return true;
}

// Remplace TOUTES les donnees de l'appareil par celles de la sauvegarde.
export async function restoreBackup(json: string): Promise<void> {
  let b: Backup;
  try {
    b = JSON.parse(json);
  } catch {
    throw new Error("Fichier illisible.");
  }
  if (b?.format !== FORMAT || !Array.isArray(b.sessions) || !Array.isArray(b.expenses)) {
    throw new Error("Ce fichier n'est pas une sauvegarde CareSync.");
  }
  await cancelAllReminders();
  await clearPhotos();
  const newUri: Record<string, string> = {};
  for (const [uri, data] of Object.entries(b.photos ?? {})) newUri[uri] = await restorePhoto(data);
  const mapUri = (u?: string) => (u ? newUri[u] : undefined);
  await replaceAll({
    sessions: b.sessions,
    expenses: b.expenses.map((e) => ({ ...e, photoUri: mapUri(e.photoUri), originalPhotoUri: mapUri(e.originalPhotoUri) })),
    events: (b.events ?? []).map((e) => ({ ...e, notificationIds: [] })),
    tasks: (b.tasks ?? []).map((t) => ({ ...t, notificationId: undefined })),
  });
  await kv.set(KEYS.childColors, b.childColors ?? {});
  // Rappels reprogrammes sur cet appareil (ceux deja passes sont ignores)
  for (const e of await eventsRepo.list()) {
    if (e.status === "prevu") await eventsRepo.save({ ...e, notificationIds: await scheduleEventReminders(e) });
  }
  for (const t of await tasksRepo.list()) await saveTask(t);
}

// Choix d'un fichier de sauvegarde
export async function pickBackupFile(): Promise<string | null> {
  if (Platform.OS !== "web") {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/json", "*/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return null;
    const file = new File(res.assets[0].uri);
    const text = await file.text();
    file.delete();
    return text;
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

// Droit a l'effacement : supprime toutes les donnees et photos de l'appareil.
export async function eraseAllData(): Promise<void> {
  await cancelAllReminders();
  await clearPhotos();
  await clearAll();
}
