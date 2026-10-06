// Types partages de l'application CareSync Pro

export type ExpenseCategory =
  | "alimentation"
  | "vetements"
  | "transport"
  | "loisirs"
  | "sante"
  | "divers"
  | "autre";

export type PaymentMethod = "especes" | "carte" | "autre";

export interface Session {
  id: string;
  label: string; // "Session du 1er au 15 octobre 2026"
  startDate: string; // ISO date
  endDate: string; // ISO date
  createdAt: string;
}

export interface Expense {
  id: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  paymentMethod: PaymentMethod;
  category: ExpenseCategory;
  comment: string;
  photoUri?: string; // local URI
  createdAt: string;
}

export type EventStatus = "prevu" | "effectue" | "annule" | "reporte";

export interface AgendaEvent {
  id: string;
  title: string;
  childName: string; // fictitious
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
  createdAt: string;
}

export interface Trip {
  id: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  vehicle: string;
  driver: string;
  kmStart: number;
  kmEnd: number;
  destination: string;
  purpose: string;
  photoUri?: string;
  createdAt: string;
}

export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; icon: string }[] = [
  { key: "alimentation", label: "Alimentation", icon: "restaurant-outline" },
  { key: "vetements", label: "Vetements", icon: "shirt-outline" },
  { key: "transport", label: "Transport", icon: "car-outline" },
  { key: "loisirs", label: "Loisirs", icon: "game-controller-outline" },
  { key: "sante", label: "Sante", icon: "medkit-outline" },
  { key: "divers", label: "Divers", icon: "ellipsis-horizontal-outline" },
  { key: "autre", label: "Autre", icon: "pricetag-outline" },
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
