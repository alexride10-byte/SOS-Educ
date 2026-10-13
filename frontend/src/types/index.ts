// Types partages de l'application CareSync Pro

export type ExpenseCategory = "alimentation" | "entretien" | "animation" | "divers";

export type PaymentMethod = "especes" | "carte" | "autre"; // "autre" : valeur historique, affichee "A verifier"

export interface Session {
  id: string;
  label: string; // "Session du 1er au 15 octobre 2026"
  startDate: string; // ISO date
  endDate: string; // ISO date
  budget?: number; // budget initial recu (EUR). Absent = 0
  carryOver?: CarryOver; // report provenant de la session precedente
  additions?: MoneyAddition[]; // ajouts exceptionnels, conserves separement
  closure?: SessionClosure; // present = session cloturee
  lastTransfer?: { toSessionId: string; amount: number }; // report deja effectue avant une reouverture
  createdAt: string;
}

export interface CarryOver {
  amount: number; // peut etre negatif (depassement reporte)
  fromSessionId: string | null; // null = saisie manuelle (aucune session source)
}

export interface MoneyAddition {
  id: string;
  date: string; // ISO datetime
  amount: number; // > 0
  reason?: string;
}

export interface SessionClosure {
  closedAt: string; // ISO datetime
  finalBalance: number;
  carryStatus: "pending" | "transferred" | "declined";
  transferredToSessionId?: string;
  transferredAmount?: number;
}

export interface Expense {
  id: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  paymentMethod: PaymentMethod | null; // null = a verifier
  category: ExpenseCategory | null; // null = "A classer" (categorie non confirmee)
  comment: string;
  photoUri?: string; // justificatif valide (recadre ou non), utilise pour l'OCR et le PDF
  originalPhotoUri?: string; // photo originale conservee
  createdAt: string;
}

export type EventStatus = "prevu" | "effectue" | "annule" | "reporte";

export interface AgendaEvent {
  id: string;
  title: string;
  childCode?: ChildCode | null; // code interne A-E, facultatif
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  durationMin: number;
  travelMin: number;
  bufferMin: number;
  comment: string;
  postComment?: string;
  status: EventStatus;
  notificationIds?: string[];
  reminders?: ReminderPrefs;
  handledReminders?: ReminderKind[]; // rappels marques "traites"
  createdAt: string;
}

// Codes internes neutres A-E : chaque maison les utilise selon son organisation.
// Aucune signification imposee (ni fratrie, ni age). Ils ne garantissent pas l'anonymat.
export type ChildCode = "A" | "B" | "C" | "D" | "E";
export const CHILD_CODES: { code: ChildCode }[] = [{ code: "A" }, { code: "B" }, { code: "C" }, { code: "D" }, { code: "E" }];

export type ReminderKind = "h1" | "m30" | "departure" | "m5";

export interface ReminderPrefs {
  h1: boolean; // T - 1 h
  m30: boolean; // T - 30 min
  departure: boolean; // a l'heure de depart calculee
  m5: boolean; // T - 5 min (facultatif)
}
export const DEFAULT_REMINDERS: ReminderPrefs = { h1: true, m30: true, departure: true, m5: false };

export type TaskStatus = "todo" | "done" | "reporte";
export interface Task {
  id: string;
  title: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reminderDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:mm
  status: TaskStatus;
  eventId?: string | null;
  notificationId?: string;
  createdAt: string;
}
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "À faire",
  done: "Terminée",
  reporte: "Reporté",
};

export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; icon: string }[] = [
  { key: "alimentation", label: "Alimentation", icon: "restaurant-outline" },
  { key: "entretien", label: "Entretien de la maison", icon: "home-outline" },
  { key: "animation", label: "Animation / sorties", icon: "happy-outline" },
  { key: "divers", label: "Divers", icon: "ellipsis-horizontal-outline" },
];

export const PAYMENT_METHODS: { key: PaymentMethod; label: string; short: string; icon: string }[] = [
  { key: "especes", label: "Espèces (ESP)", short: "ESP", icon: "cash-outline" },
  { key: "carte", label: "Carte bancaire (CB)", short: "CB", icon: "card-outline" },
];

export function paymentLabel(p: PaymentMethod | null | undefined): string {
  return p === "especes" ? "ESP" : p === "carte" ? "CB" : "À vérifier";
}

// Une depense est "a verifier" si son motif ou son mode de paiement n'est pas confirme
export function needsReview(e: Pick<Expense, "category" | "paymentMethod">): boolean {
  return !e.category || (e.paymentMethod !== "especes" && e.paymentMethod !== "carte");
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  prevu: "Prévu",
  effectue: "Réalisé",
  annule: "Annulé",
  reporte: "Reporté",
};
