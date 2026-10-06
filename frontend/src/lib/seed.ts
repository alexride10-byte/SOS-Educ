// Donnees fictives pour tester immediatement l'application.
// IMPORTANT: aucun nom reel, aucune donnee reelle.

import {
  eventsRepo,
  expensesRepo,
  seededFlag,
  sessionsRepo,
  tripsRepo,
} from "./storage";
import { AgendaEvent, Expense, Session, Trip } from "@/src/types";

function iso(d: Date) {
  return d.toISOString().split("T")[0];
}

export async function seedIfNeeded() {
  if (await seededFlag.get()) return;

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 5);
  const end = new Date(start);
  end.setDate(start.getDate() + 14);

  const sess: Session = {
    id: "sess-demo-1",
    label: `Session du ${start.getDate()}/${start.getMonth() + 1} au ${end.getDate()}/${end.getMonth() + 1}`,
    startDate: iso(start),
    endDate: iso(end),
    createdAt: new Date().toISOString(),
  };
  await sessionsRepo.save(sess);

  const demoExpenses: Expense[] = [
    {
      id: "exp-1",
      sessionId: sess.id,
      date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      merchant: "Supermarche Local",
      amount: 42.3,
      paymentMethod: "carte",
      category: "alimentation",
      comment: "Courses de la semaine (demo)",
      createdAt: new Date().toISOString(),
    },
    {
      id: "exp-2",
      sessionId: sess.id,
      date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      merchant: "Pharmacie Centre",
      amount: 12.9,
      paymentMethod: "especes",
      category: "sante",
      comment: "",
      createdAt: new Date().toISOString(),
    },
    {
      id: "exp-3",
      sessionId: sess.id,
      date: iso(today),
      merchant: "Librairie du Parc",
      amount: 18.5,
      paymentMethod: "carte",
      category: "loisirs",
      comment: "Livre (demo)",
      createdAt: new Date().toISOString(),
    },
  ];
  for (const e of demoExpenses) await expensesRepo.save(e);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const demoEvents: AgendaEvent[] = [
    {
      id: "evt-1",
      title: "Consultation medecin",
      childName: "Enfant A (fictif)",
      date: iso(today),
      time: "15:00",
      location: "Cabinet medical",
      durationMin: 45,
      travelMin: 25,
      bufferMin: 10,
      comment: "Apporter le carnet",
      status: "prevu",
      createdAt: new Date().toISOString(),
    },
    {
      id: "evt-2",
      title: "Reunion ecole",
      childName: "Enfant B (fictif)",
      date: iso(tomorrow),
      time: "10:30",
      location: "Ecole primaire",
      durationMin: 60,
      travelMin: 15,
      bufferMin: 10,
      comment: "",
      status: "prevu",
      createdAt: new Date().toISOString(),
    },
    {
      id: "evt-3",
      title: "Activite sportive",
      childName: "Enfant C (fictif)",
      date: iso(dayAfter),
      time: "17:00",
      location: "Gymnase",
      durationMin: 90,
      travelMin: 20,
      bufferMin: 5,
      comment: "",
      status: "prevu",
      createdAt: new Date().toISOString(),
    },
  ];
  for (const e of demoEvents) await eventsRepo.save(e);

  const demoTrips: Trip[] = [
    {
      id: "trip-1",
      sessionId: sess.id,
      date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      vehicle: "Renault Clio (demo)",
      driver: "Educateur (demo)",
      kmStart: 84200,
      kmEnd: 84245,
      destination: "Ecole primaire",
      purpose: "Depose enfant",
      createdAt: new Date().toISOString(),
    },
    {
      id: "trip-2",
      sessionId: sess.id,
      date: iso(today),
      vehicle: "Renault Clio (demo)",
      driver: "Educateur (demo)",
      kmStart: 84245,
      kmEnd: 84290,
      destination: "Cabinet medical",
      purpose: "Rendez-vous medical",
      createdAt: new Date().toISOString(),
    },
  ];
  for (const t of demoTrips) await tripsRepo.save(t);

  await seededFlag.set();
}
