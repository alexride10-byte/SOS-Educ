/// <reference types="jest" />
// Tests de calcul et de logique (sans interface). Lancer : npx jest
import { computeBudget, findPendingCarry } from "@/src/lib/money";
import { planEventReminders } from "@/src/lib/reminder-plan";
import { computeDeparture, dayBefore } from "@/src/lib/time";
import { DEFAULT_REMINDERS, Expense, Session, needsReview } from "@/src/types";

const exp = (amount: number, category: Expense["category"], paymentMethod: Expense["paymentMethod"] = "carte"): Expense => ({
  id: Math.random().toString(),
  sessionId: "s",
  date: "2026-10-01",
  merchant: "Test",
  amount,
  paymentMethod,
  category,
  comment: "",
  createdAt: "",
});

const session = (over: Partial<Session> = {}): Session => ({
  id: "s",
  label: "",
  startDate: "2026-10-01",
  endDate: "",
  createdAt: "",
  ...over,
});

describe("budget", () => {
  it("exemple du cahier des charges : 80 + 500 + 100 - 420 = 260", () => {
    const s = session({
      budget: 500,
      carryOver: { amount: 80, fromSessionId: "prev" },
      additions: [{ id: "a", date: "", amount: 100 }],
    });
    const b = computeBudget(s, [exp(300, "alimentation"), exp(120, "entretien")]);
    expect(b.available).toBe(680);
    expect(b.total).toBe(420);
    expect(b.remaining).toBe(260);
    expect(b.percentSpent).toBeCloseTo((420 / 680) * 100);
  });

  it("plusieurs ajouts sont additionnés une seule fois chacun", () => {
    const s = session({ budget: 100, additions: [{ id: "a", date: "", amount: 10 }, { id: "b", date: "", amount: 15.5 }] });
    expect(computeBudget(s, []).available).toBe(125.5);
  });

  it("report négatif réduit le budget disponible", () => {
    const b = computeBudget(session({ budget: 500, carryOver: { amount: -40, fromSessionId: "p" } }), [exp(500, "divers")]);
    expect(b.available).toBe(460);
    expect(b.remaining).toBe(-40);
  });

  it("session ancienne sans budget ni report : 0 €, pourcentage indéfini", () => {
    const b = computeBudget(session(), [exp(10, "divers")]);
    expect(b.available).toBe(0);
    expect(b.remaining).toBe(-10);
    expect(b.percentSpent).toBeNull();
  });

  it("arrondis au centime sans dérive", () => {
    const b = computeBudget(session({ budget: 0.3 }), [exp(0.1, "divers"), exp(0.2, "divers")]);
    expect(b.total).toBe(0.3);
    expect(b.remaining).toBe(0);
  });

  it("répartition : seules les dépenses classées, somme des catégories = total classé", () => {
    const b = computeBudget(session({ budget: 500 }), [exp(160, "alimentation"), exp(80, "entretien"), exp(50, "animation"), exp(30, "divers"), exp(9.9, null)]);
    expect(b.classifiedTotal).toBe(320);
    expect(b.unclassifiedTotal).toBe(9.9);
    expect(b.byCategory.reduce((s, c) => s + c.amount, 0)).toBe(320);
    expect(b.byCategory.reduce((s, c) => s + c.percent, 0)).toBeCloseTo(100);
    expect(b.byCategory.find((c) => c.key === "alimentation")!.percent).toBe(50);
    expect(b.total).toBe(329.9);
  });
});

describe("report entre sessions", () => {
  const closed = (id: string, status: "pending" | "transferred" | "declined", at: string): Session =>
    session({ id, closure: { closedAt: at, finalBalance: 10, carryStatus: status } });

  it("ne propose que les soldes en attente, le plus récent d'abord", () => {
    const list = [closed("a", "transferred", "2026-09-01"), closed("b", "pending", "2026-09-15"), closed("c", "pending", "2026-10-01")];
    expect(findPendingCarry(list)?.id).toBe("c");
  });

  it("un solde déjà reporté ou refusé n'est jamais reproposé", () => {
    expect(findPendingCarry([closed("a", "transferred", "x"), closed("b", "declined", "y"), session()])).toBeNull();
  });
});

describe("heure de départ", () => {
  it("15:00 - 25 min - 10 min = 14:25", () => expect(computeDeparture("15:00", 25, 10)).toBe("14:25"));
  it("passage d'heure : 09:10 - 20 - 5 = 08:45", () => expect(computeDeparture("09:10", 20, 5)).toBe("08:45"));
  it("veille d'une date (changement de mois)", () => expect(dayBefore("2026-11-01")).toBe("2026-10-31"));
});

describe("rappels", () => {
  const base = { time: "15:00", travelMin: 25, bufferMin: 10, status: "prevu" as const };

  it("par défaut : 1 h, 30 min, départ (35 min) ; 5 min désactivé", () => {
    expect(planEventReminders({ ...base, reminders: DEFAULT_REMINDERS })).toEqual([
      { kind: "h1", minsBefore: 60 },
      { kind: "departure", minsBefore: 35 },
      { kind: "m30", minsBefore: 30 },
    ]);
  });

  it("fusion des doublons : départ à T-30 remplace la préparation", () => {
    const plan = planEventReminders({ ...base, travelMin: 20, bufferMin: 10 });
    expect(plan.filter((p) => p.minsBefore === 30)).toEqual([{ kind: "departure", minsBefore: 30 }]);
  });

  it("aucun rappel si le rendez-vous n'est pas prévu", () => {
    for (const status of ["annule", "reporte", "effectue"] as const) expect(planEventReminders({ ...base, status })).toEqual([]);
  });

  it("choix par rendez-vous respecté", () => {
    expect(planEventReminders({ ...base, reminders: { h1: false, m30: false, departure: true, m5: true } })).toEqual([
      { kind: "departure", minsBefore: 35 },
      { kind: "m5", minsBefore: 5 },
    ]);
  });
});

describe("dépenses à vérifier", () => {
  it("motif ou paiement non confirmé", () => {
    expect(needsReview({ category: "divers", paymentMethod: "carte" })).toBe(false);
    expect(needsReview({ category: null, paymentMethod: "carte" })).toBe(true);
    expect(needsReview({ category: "divers", paymentMethod: null })).toBe(true);
    expect(needsReview({ category: "divers", paymentMethod: "autre" })).toBe(true);
  });
});
