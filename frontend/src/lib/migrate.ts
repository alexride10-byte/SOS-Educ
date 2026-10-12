// Migration v2 (une seule fois) : nouvelles categories, codes enfants, suppression des trajets,
// et complements de demonstration (budget, depenses, preparations) - donnees fictives uniquement.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { eventsRepo, expensesRepo, KEYS, kv, sessionsRepo, tasksRepo } from "./storage";
import { ChildCode, Expense, ExpenseCategory, Task } from "@/src/types";

const CATEGORY_MAP: Record<string, ExpenseCategory> = {
  alimentation: "alimentation",
  entretien: "entretien",
  animation: "animation",
  divers: "divers",
  loisirs: "animation",
  vetements: "divers",
  transport: "divers",
  sante: "divers",
  autre: "divers",
};

function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function migrateV2() {
  if (await kv.get(KEYS.migratedV2, false)) return;

  for (const e of await expensesRepo.list()) {
    const raw = e.category as string | null;
    const mapped = raw ? (CATEGORY_MAP[raw] ?? null) : null;
    if (mapped !== raw) await expensesRepo.save({ ...e, category: mapped });
  }

  for (const ev of await eventsRepo.list()) {
    const { childName, ...rest } = ev as typeof ev & { childName?: string };
    if (childName !== undefined) {
      const m = /Enfant ([A-E])\b/.exec(childName);
      await eventsRepo.save({ ...rest, childCode: ev.childCode ?? ((m?.[1] as ChildCode) || null) });
    }
  }

  // Module vehicule retire du MVP : suppression des trajets enregistres localement
  await AsyncStorage.removeItem(KEYS.legacyTrips);

  const demo = (await sessionsRepo.list()).find((s) => s.id === "sess-demo-1");
  if (demo) {
    if (demo.budget == null) await sessionsRepo.save({ ...demo, budget: 500 });
    const existing = await expensesRepo.list();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const extras: Expense[] = [
      {
        id: "exp-4",
        sessionId: demo.id,
        date: localIso(yesterday),
        merchant: "Droguerie du Centre",
        amount: 26.4,
        paymentMethod: "carte",
        category: "entretien",
        comment: "Produits menagers (demo)",
        createdAt: new Date().toISOString(),
      },
      {
        id: "exp-5",
        sessionId: demo.id,
        date: localIso(today),
        merchant: "Bazar Express",
        amount: 9.9,
        paymentMethod: "especes",
        category: null,
        comment: "Motif a confirmer (demo)",
        createdAt: new Date().toISOString(),
      },
    ];
    for (const x of extras) if (!existing.find((e) => e.id === x.id)) await expensesRepo.save(x);

    if ((await tasksRepo.list()).length === 0) {
      const events = await eventsRepo.list();
      const sport = events.find((e) => e.id === "evt-3");
      const medical = events.find((e) => e.id === "evt-1");
      const tasks: Task[] = [];
      if (sport) {
        const eve = new Date(`${sport.date}T00:00:00`);
        eve.setDate(eve.getDate() - 1);
        tasks.push({
          id: "task-1",
          title: "Preparer le pique-nique",
          dueDate: sport.date,
          reminderDate: localIso(eve),
          reminderTime: "18:00",
          status: "todo",
          eventId: sport.id,
          createdAt: new Date().toISOString(),
        });
      }
      if (medical) {
        tasks.push({
          id: "task-2",
          title: "Prendre le carnet de sante",
          dueDate: medical.date,
          dueTime: medical.time,
          status: "todo",
          eventId: medical.id,
          createdAt: new Date().toISOString(),
        });
      }
      for (const t of tasks) await tasksRepo.save(t);
    }
  }

  await kv.set(KEYS.migratedV2, true);
}
