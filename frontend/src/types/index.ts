// Types partages de l'application CareSync Pro

export type ExpenseCategory = "alimentation" | "entretien" | "animation" | "divers";

export type PaymentMethod = "especes" | "carte" | "autre";

export interface Session {
  id: string;
  label: string; // "Session du 1er au 15 octobre 2026"
  startDate: string; // ISO date
  endDate: string; // ISO date
  budget?: number; // budget initial (EUR), defini manuellement
  createdAt: string;
}

export interface Expense {
  id: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  paymentMethod: PaymentMethod;
  category: ExpenseCategory | null; // null = "A classer" (categorie non confirmee)
  comment: string;
  photoUri?: string; // local URI
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
  createdAt: string;
}

// Codes internes des enfants. A, B, C : fratrie 1 ; D, E : fratrie 2 (du plus jeune au plus age).
// Ce sont des codes internes : ils ne garantissent pas l'anonymat.
export type ChildCode = "A" | "B" | "C" | "D" | "E";
export const CHILD_CODES: { code: ChildCode; group: 1 | 2 }[] = [
  { code: "A", group: 1 },
  { code: "B", group: 1 },
  { code: "C", group: 1 },
  { code: "D", group: 2 },
  { code: "E", group: 2 },
];

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
  done: "Fait",
  reporte: "Reporté",
};

export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; icon: string }[] = [
  { key: "alimentation", label: "Alimentation", icon: "restaurant-outline" },
  { key: "entretien", label: "Entretien de la maison", icon: "home-outline" },
  { key: "animation", label: "Animation / sorties", icon: "happy-outline" },
  { key: "divers", label: "Divers", icon: "ellipsis-horizontal-outline" },
];

export const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: "especes", label: "Especes", icon: "cash-outline" },
  { key: "carte", label: "Carte", icon: "card-outline" },
  { key: "autre", label: "Autre", icon: "wallet-outline" },
];

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  prevu: "Prevu",
  effectue: "Effectue",
  annule: "Annule",
  reporte: "Reporte",
};
