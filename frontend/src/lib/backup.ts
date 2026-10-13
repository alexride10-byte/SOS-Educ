// Sauvegarde manuelle de toutes les donnees locales (fichier JSON partage par l'utilisateur).
// Le fichier contient des donnees sensibles : a conserver dans un emplacement maitrise.
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { eventsRepo, expensesRepo, KEYS, kv, sessionsRepo, tasksRepo } from "./storage";
import { localIso } from "./time";

export async function exportBackup(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const payload = {
    format: "caresync-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    sessions: await sessionsRepo.list(),
    expenses: await expensesRepo.list(),
    events: await eventsRepo.list(),
    tasks: await tasksRepo.list(),
    childColors: await kv.get(KEYS.childColors, {}),
  };
  const file = new File(Paths.cache, `caresync-sauvegarde-${localIso()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(payload, null, 2));
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Sauvegarde CareSync" });
  return true;
}
