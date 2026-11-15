// Couche de stockage locale (offline-first) basee sur AsyncStorage.
// Pensee pour etre remplacee plus tard par une sync chiffree sans toucher aux ecrans.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AgendaEvent, Expense, Session, Task } from "@/src/types";

const K = {
  sessions: "cs.sessions.v1",
  expenses: "cs.expenses.v1",
  events: "cs.events.v1",
  tasks: "cs.tasks.v1",
  childColors: "cs.childColors.v1",
  seeded: "cs.seeded.v1",
};

async function readList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

const writeList = <T>(key: string, items: T[]) => AsyncStorage.setItem(key, JSON.stringify(items));

// Liste d'objets identifies : lecture, ajout/mise a jour (les nouveaux en tete), suppression
function repo<T extends { id: string }>(key: string) {
  return {
    list: () => readList<T>(key),
    save: async (item: T) => {
      const items = await readList<T>(key);
      const idx = items.findIndex((x) => x.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.unshift(item);
      await writeList(key, items);
    },
    remove: async (id: string) => writeList(key, (await readList<T>(key)).filter((x) => x.id !== id)),
  };
}

export const sessionsRepo = repo<Session>(K.sessions);
export const expensesRepo = repo<Expense>(K.expenses);
export const eventsRepo = repo<AgendaEvent>(K.events);
export const tasksRepo = repo<Task>(K.tasks);

export const KEYS = K;

// Petites valeurs (reglages)
export const kv = {
  get: async <T>(key: string, fallback: T): Promise<T> => {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set: (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)),
};

export const seededFlag = {
  get: async () => (await AsyncStorage.getItem(K.seeded)) === "1",
  set: () => AsyncStorage.setItem(K.seeded, "1"),
};

// Efface toutes les donnees. Le drapeau "demo deja chargee" est repose :
// l'app redemarre vide, sans recharger les donnees de demonstration.
export async function clearAll() {
  await AsyncStorage.multiRemove(Object.values(K));
  await seededFlag.set();
}

// Remplacement complet (restauration d'une sauvegarde)
export async function replaceAll(data: { sessions: Session[]; expenses: Expense[]; events: AgendaEvent[]; tasks: Task[] }) {
  await clearAll();
  await writeList(K.sessions, data.sessions);
  await writeList(K.expenses, data.expenses);
  await writeList(K.events, data.events);
  await writeList(K.tasks, data.tasks);
}
