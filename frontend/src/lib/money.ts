// Calculs budgetaires d'une session. Fonctions pures, sans valeur codee en dur.
import { EXPENSE_CATEGORIES, Expense, ExpenseCategory } from "@/src/types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function fmtEur(n: number): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export interface BudgetSummary {
  budget: number | null; // null = non defini
  total: number; // toutes les depenses de la session
  remaining: number | null; // budget - total (peut etre negatif = depassement)
  percentSpent: number | null; // pourcentage reel (peut depasser 100)
  classifiedTotal: number; // somme des depenses classees = somme des categories
  unclassifiedTotal: number;
  unclassifiedCount: number;
  byCategory: { key: ExpenseCategory; label: string; amount: number; percent: number }[];
}

export function computeBudget(budget: number | undefined, expenses: Expense[]): BudgetSummary {
  const total = round2(expenses.reduce((s, e) => s + (e.amount || 0), 0));
  const unclassified = expenses.filter((e) => !e.category);
  const unclassifiedTotal = round2(unclassified.reduce((s, e) => s + (e.amount || 0), 0));
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    amount: round2(expenses.filter((e) => e.category === c.key).reduce((s, e) => s + (e.amount || 0), 0)),
    percent: 0,
  }));
  const classifiedTotal = round2(byCategory.reduce((s, c) => s + c.amount, 0));
  for (const c of byCategory) c.percent = classifiedTotal > 0 ? (c.amount / classifiedTotal) * 100 : 0;

  const hasBudget = typeof budget === "number" && budget > 0;
  return {
    budget: hasBudget ? round2(budget!) : null,
    total,
    remaining: hasBudget ? round2(budget! - total) : null,
    percentSpent: hasBudget ? (total / budget!) * 100 : null,
    classifiedTotal,
    unclassifiedTotal,
    unclassifiedCount: unclassified.length,
    byCategory,
  };
}
