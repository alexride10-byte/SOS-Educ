// Donnees fictives pour tester immediatement l'application (premier lancement uniquement).
// IMPORTANT: aucun nom reel, aucune donnee reelle. Effacables via "Commencer avec une appli vide".
import { eventsRepo, expensesRepo, seededFlag, sessionsRepo, tasksRepo } from "./storage";
import { sessionLabel } from "./sessions";
import { localIso } from "./time";
import { AgendaEvent, Expense, Session, Task } from "@/src/types";

export async function seedIfNeeded() {
  if (await seededFlag.get()) return;

  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return localIso(d);
  };
  const now = new Date().toISOString();

  const session: Session = {
    id: "sess-demo-1",
    label: sessionLabel(day(-5), day(9)),
    startDate: day(-5),
    endDate: day(9),
    budget: 500,
    createdAt: now,
  };
  await sessionsRepo.save(session);

  const expense = (id: string, offset: number, merchant: string, amount: number, e: Partial<Expense>): Expense => ({
    id,
    sessionId: session.id,
    date: day(offset),
    merchant,
    amount,
    paymentMethod: "carte",
    category: null,
    comment: "",
    createdAt: now,
    ...e,
  });
  const expenses = [
    expense("exp-1", -2, "Supermarche Local", 42.3, { category: "alimentation", comment: "Courses de la semaine (demo)" }),
    expense("exp-2", -1, "Pharmacie Centre", 12.9, { category: "divers", paymentMethod: "especes" }),
    expense("exp-3", 0, "Librairie du Parc", 18.5, { category: "animation", comment: "Livre (demo)" }),
    expense("exp-4", -1, "Droguerie du Centre", 26.4, { category: "entretien", comment: "Produits menagers (demo)" }),
    expense("exp-5", 0, "Bazar Express", 9.9, { paymentMethod: "especes", comment: "Motif a confirmer (demo)" }),
  ];
  for (const e of expenses) await expensesRepo.save(e);

  const event = (id: string, offset: number, e: Pick<AgendaEvent, "title" | "childCode" | "time" | "location" | "durationMin" | "travelMin" | "bufferMin" | "comment">): AgendaEvent => ({
    id,
    date: day(offset),
    status: "prevu",
    createdAt: now,
    ...e,
  });
  const events = [
    event("evt-1", 0, { title: "Consultation medecin", childCode: "A", time: "15:00", location: "Cabinet medical", durationMin: 45, travelMin: 25, bufferMin: 10, comment: "Apporter le carnet" }),
    event("evt-2", 1, { title: "Reunion ecole", childCode: "B", time: "10:30", location: "Ecole primaire", durationMin: 60, travelMin: 15, bufferMin: 10, comment: "" }),
    event("evt-3", 2, { title: "Activite sportive", childCode: "C", time: "17:00", location: "Gymnase", durationMin: 90, travelMin: 20, bufferMin: 5, comment: "" }),
  ];
  for (const e of events) await eventsRepo.save(e);

  const tasks: Task[] = [
    { id: "task-1", title: "Preparer le pique-nique", dueDate: day(2), reminderDate: day(1), reminderTime: "18:00", status: "todo", eventId: "evt-3", createdAt: now },
    { id: "task-2", title: "Prendre le carnet de sante", dueDate: day(0), dueTime: "15:00", status: "todo", eventId: "evt-1", createdAt: now },
  ];
  for (const t of tasks) await tasksRepo.save(t);

  await seededFlag.set();
}
