// Calculs budgetaires d'une session. Fonctions pures, sans valeur codee en dur.
import { EXPENSE_CATEGORIES, Expense, ExpenseCategory, Session } from "@/src/types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function fmtEur(n: number): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export interface BudgetSummary {
  initial: number; // budget initial recu
  carryOver: number; // report de la session precedente (peut etre negatif)
  additionsTotal: number; // somme des ajouts exceptionnels
  available: number; // report + initial + ajouts
  total: number; // toutes les depenses de la session
  remaining: number; // available - total (negatif = depassement)
  percentSpent: number | null; // null si budget disponible <= 0
  classifiedTotal: number; // somme des depenses classees = somme des categories
  unclassifiedTotal: number;
  unclassifiedCount: number;
  byCategory: { key: ExpenseCategory; label: string; amount: number; percent: number }[];
}

type BudgetSource = Pick<Session, "budget" | "carryOver" | "additions"> | null | undefined;

// Calcul a partir des donnees enregistrees uniquement.
// Budget disponible = report + budget initial + total des ajouts ; solde = disponible - depenses.
export function computeBudget(session: BudgetSource, expenses: Expense[]): BudgetSummary {
  const sum = (xs: Expense[]) => round2(xs.reduce((s, e) => s + (e.amount || 0), 0));
  const initial = round2(session?.budget ?? 0);
  const carryOver = round2(session?.carryOver?.amount ?? 0);
  const additionsTotal = round2((session?.additions ?? []).reduce((s, a) => s + (a.amount || 0), 0));
  const available = round2(carryOver + initial + additionsTotal);
  const total = sum(expenses);
  const unclassified = expenses.filter((e) => !e.category);
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    amount: sum(expenses.filter((e) => e.category === c.key)),
    percent: 0,
  }));
  const classifiedTotal = round2(byCategory.reduce((s, c) => s + c.amount, 0));
  for (const c of byCategory) c.percent = classifiedTotal > 0 ? (c.amount / classifiedTotal) * 100 : 0;

  return {
    initial,
    carryOver,
    additionsTotal,
    available,
    total,
    remaining: round2(available - total),
    percentSpent: available > 0 ? (total / available) * 100 : null,
    classifiedTotal,
    unclassifiedTotal: sum(unclassified),
    unclassifiedCount: unclassified.length,
    byCategory,
  };
}

// Session cloturee dont le solde attend d'etre reporte (la plus recente). Un solde deja
// reporte ("transferred") ou refuse ("declined") n'est jamais propose une seconde fois.
export function findPendingCarry(sessions: Session[]): Session | null {
  return (
    sessions
      .filter((s) => s.closure?.carryStatus === "pending")
      .sort((a, b) => b.closure!.closedAt.localeCompare(a.closure!.closedAt))[0] ?? null
  );
}
