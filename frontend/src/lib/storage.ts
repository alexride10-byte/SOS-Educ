// Couche de stockage locale (offline-first) basee sur AsyncStorage.
// Pensee pour etre remplacee plus tard par une sync chiffree sans toucher aux ecrans.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AgendaEvent, Expense, Session, Trip } from "@/src/types";

const K = {
  sessions: "cs.sessions.v1",
  expenses: "cs.expenses.v1",
  events: "cs.events.v1",
  trips: "cs.trips.v1",
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

async function writeList<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export const sessionsRepo = {
  list: () => readList<Session>(K.sessions),
  save: async (s: Session) => {
    const items = await readList<Session>(K.sessions);
    const idx = items.findIndex((x) => x.id === s.id);
    if (idx >= 0) items[idx] = s;
    else items.unshift(s);
    await writeList(K.sessions, items);
  },
  remove: async (id: string) => {
    const items = (await readList<Session>(K.sessions)).filter((x) => x.id !== id);
    await writeList(K.sessions, items);
  },
};

export const expensesRepo = {
  list: () => readList<Expense>(K.expenses),
  save: async (e: Expense) => {
    const items = await readList<Expense>(K.expenses);
    const idx = items.findIndex((x) => x.id === e.id);
    if (idx >= 0) items[idx] = e;
    else items.unshift(e);
    await writeList(K.expenses, items);
  },
  remove: async (id: string) => {
    const items = (await readList<Expense>(K.expenses)).filter((x) => x.id !== id);
    await writeList(K.expenses, items);
  },
};

export const eventsRepo = {
  list: () => readList<AgendaEvent>(K.events),
  save: async (e: AgendaEvent) => {
    const items = await readList<AgendaEvent>(K.events);
    const idx = items.findIndex((x) => x.id === e.id);
    if (idx >= 0) items[idx] = e;
    else items.unshift(e);
    await writeList(K.events, items);
  },
  remove: async (id: string) => {
    const items = (await readList<AgendaEvent>(K.events)).filter((x) => x.id !== id);
    await writeList(K.events, items);
  },
};

export const tripsRepo = {
  list: () => readList<Trip>(K.trips),
  save: async (t: Trip) => {
    const items = await readList<Trip>(K.trips);
    const idx = items.findIndex((x) => x.id === t.id);
    if (idx >= 0) items[idx] = t;
    else items.unshift(t);
    await writeList(K.trips, items);
  },
  remove: async (id: string) => {
    const items = (await readList<Trip>(K.trips)).filter((x) => x.id !== id);
    await writeList(K.trips, items);
  },
};

export const seededFlag = {
  get: async () => (await AsyncStorage.getItem(K.seeded)) === "1",
  set: () => AsyncStorage.setItem(K.seeded, "1"),
};

export async function clearAll() {
  await AsyncStorage.multiRemove(Object.values(K));
}
