// Operations sur les sessions : creation avec report, ajouts, cloture, reouverture.
// Toutes les valeurs sont relues depuis le stockage (jamais depuis l'affichage).
import { computeBudget, round2 } from "./money";
import { localIso } from "./time";
import { expensesRepo, sessionsRepo } from "./storage";
import { Session } from "@/src/types";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function shortDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function sessionLabel(start: string, end?: string) {
  return end ? `Session du ${shortDate(start)} au ${shortDate(end)}` : `Session à partir du ${shortDate(start)}`;
}

export async function getSession(id: string): Promise<Session | null> {
  return (await sessionsRepo.list()).find((s) => s.id === id) ?? null;
}

export async function sessionBalance(id: string): Promise<number> {
  const s = await getSession(id);
  const expenses = (await expensesRepo.list()).filter((e) => e.sessionId === id);
  return computeBudget(s, expenses).remaining;
}

export async function createSession(input: {
  startDate: string;
  endDate?: string;
  budget: number;
  carryAmount: number;
  fromSessionId: string | null;
}): Promise<Session> {
  let carry = { amount: round2(input.carryAmount), fromSessionId: input.fromSessionId };
  let source: Session | null = null;
  if (input.fromSessionId) {
    source = await getSession(input.fromSessionId);
    // Garde-fou : le report n'est repris que s'il est toujours en attente (jamais deux fois)
    if (!source?.closure || source.closure.carryStatus !== "pending") {
      throw new Error("Ce report a déjà été utilisé ou n'est plus disponible.");
    }
    carry = { amount: source.closure.finalBalance, fromSessionId: source.id };
  }
  const session: Session = {
    id: uid("sess"),
    label: sessionLabel(input.startDate, input.endDate),
    startDate: input.startDate,
    endDate: input.endDate ?? "",
    budget: round2(input.budget),
    carryOver: carry,
    additions: [],
    createdAt: new Date().toISOString(),
  };
  await sessionsRepo.save(session);
  if (source?.closure) {
    await sessionsRepo.save({
      ...source,
      closure: { ...source.closure, carryStatus: "transferred", transferredToSessionId: session.id, transferredAmount: carry.amount },
      lastTransfer: undefined,
    });
  }
  return session;
}

export async function addMoney(sessionId: string, amount: number, reason?: string) {
  const s = await getSession(sessionId);
  if (!s || s.closure) throw new Error("Session introuvable ou clôturée.");
  if (!(amount > 0)) throw new Error("Montant invalide.");
  await sessionsRepo.save({
    ...s,
    additions: [...(s.additions ?? []), { id: uid("add"), date: new Date().toISOString(), amount: round2(amount), reason: reason?.trim() || undefined }],
  });
}

export async function updateInitialBudget(sessionId: string, budget: number) {
  const s = await getSession(sessionId);
  if (!s || s.closure) return;
  await sessionsRepo.save({ ...s, budget: round2(Math.max(0, budget)) });
}

// Cloture. Si la session avait deja ete reportee puis rouverte, le report lie peut etre mis a jour
// (updateLinked) apres confirmation ; sinon l'ancien montant reste en place.
export async function closeSession(sessionId: string, opts: { report: boolean; updateLinked: boolean }) {
  const s = await getSession(sessionId);
  if (!s || s.closure) return;
  const finalBalance = await sessionBalance(sessionId);
  const closedAt = new Date().toISOString();
  const target = s.lastTransfer ? await getSession(s.lastTransfer.toSessionId) : null;

  if (s.lastTransfer && target) {
    const amount = opts.updateLinked ? finalBalance : s.lastTransfer.amount;
    if (opts.updateLinked) await sessionsRepo.save({ ...target, carryOver: { amount: finalBalance, fromSessionId: s.id } });
    await sessionsRepo.save({
      ...s,
      closure: { closedAt, finalBalance, carryStatus: "transferred", transferredToSessionId: target.id, transferredAmount: amount },
      lastTransfer: undefined,
    });
    return;
  }
  await sessionsRepo.save({
    ...s,
    closure: { closedAt, finalBalance, carryStatus: opts.report ? "pending" : "declined" },
    lastTransfer: undefined,
  });
}

export async function reopenSession(sessionId: string) {
  const s = await getSession(sessionId);
  if (!s?.closure) return;
  const c = s.closure;
  await sessionsRepo.save({
    ...s,
    closure: undefined,
    lastTransfer:
      c.carryStatus === "transferred" && c.transferredToSessionId
        ? { toSessionId: c.transferredToSessionId, amount: c.transferredAmount ?? c.finalBalance }
        : undefined,
  });
}

export const todayIso = () => localIso();
