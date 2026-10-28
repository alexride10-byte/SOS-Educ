// Analyse du texte brut d'un ticket de caisse (issu de l'OCR local). Logique pure, testee.
// Principe : ne jamais deviner. Une information incertaine reste null et sera "A verifier".
import { ExpenseCategory } from "@/src/types";

export interface ParsedReceipt {
  date: string | null; // YYYY-MM-DD
  merchant: string | null;
  amount: number | null;
  category: ExpenseCategory | null;
  payment_method: "especes" | "carte" | null;
}

// Majuscules sans accents, pour comparer des textes OCR souvent bruites
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

const AMOUNT_RE = /(\d{1,4}(?:[ .]\d{3})*)\s?[.,]\s?(\d{2})(?!\d)/g;

function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(AMOUNT_RE)) {
    const v = parseFloat(`${m[1].replace(/[ .]/g, "")}.${m[2]}`);
    if (v > 0 && v < 100000) out.push(v);
  }
  return out;
}

// Lignes de total, de la plus fiable a la moins fiable
const TOTAL_PRIORITY: RegExp[] = [
  /\b(NET\s*A\s*PAYER|A\s*PAYER|MONTANT\s*A\s*PAYER)\b/,
  /\bTOTAL\s*(TTC|EUR|€)/,
  /\bTOTAL\b/,
  /\bMONTANT\b/,
];
const NOT_TOTAL = /(TVA|\bHT\b|SOUS[\s-]?TOTAL|REMISE|ECONOMIE|POINTS?|FIDELITE|CAGNOTTE|RENDU)/;

export function parseAmount(lines: string[]): number | null {
  for (const re of TOTAL_PRIORITY) {
    const found: number[] = [];
    lines.forEach((l, i) => {
      if (!re.test(l) || NOT_TOTAL.test(l)) return;
      // Le montant est parfois imprime sur la ligne suivante
      const vals = amountsIn(l);
      found.push(...(vals.length ? vals : amountsIn(lines[i + 1] ?? "")));
    });
    if (found.length) return Math.max(...found);
  }
  return null;
}

export function parseDate(text: string, today: Date = new Date()): string | null {
  const re = /\b(\d{1,2})\s?[/.-]\s?(\d{1,2})\s?[/.-]\s?(\d{4}|\d{2})\b/g;
  for (const m of text.matchAll(re)) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    if (d < 1 || d > 31 || mo < 1 || mo > 12) continue;
    const date = new Date(y, mo - 1, d);
    if (date.getMonth() !== mo - 1) continue; // ex. 31/02
    const ageDays = (today.getTime() - date.getTime()) / 86400000;
    if (ageDays < -1 || ageDays > 400) continue; // ticket du futur ou trop ancien : lecture douteuse
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

const CASH_RE = /\b(ESPECES?|ESP|CASH|RENDU|MONNAIE)\b/;
const CARD_RE = /\b(CB|CARTE|VISA|MASTERCARD|MAESTRO|SANS\s*CONTACT|CONTACTLESS|DEBIT)\b/;

// Les deux indices presents (ex. paiement mixte) : on ne tranche pas.
export function parsePayment(text: string): "especes" | "carte" | null {
  const cash = CASH_RE.test(text);
  const card = CARD_RE.test(text);
  if (cash === card) return null;
  return cash ? "especes" : "carte";
}

const CATEGORY_HINTS: [ExpenseCategory, RegExp][] = [
  [
    "alimentation",
    /\b(CARREFOUR|LECLERC|AUCHAN|LIDL|ALDI|INTERMARCHE|SUPER\s*U|HYPER\s*U|SYSTEME\s*U|CASINO|FRANPRIX|MONOPRIX|NETTO|SPAR|COLRUYT|CORA|MATCH|GRAND\s*FRAIS|PICARD|BIOCOOP|BOULANGERIE|BOUCHERIE|PRIMEUR|SUPERMARCHE|EPICERIE)\b/,
  ],
  ["entretien", /\b(CASTORAMA|LEROY\s*MERLIN|BRICOMARCHE|BRICO\s*DEPOT|MR\s*BRICOLAGE|DROGUERIE|QUINCAILLERIE|ACTION)\b/],
  ["animation", /\b(CINEMA|PATHE|GAUMONT|MEGARAMA|BOWLING|PISCINE|MUSEE|ZOO|LASER\s*GAME|ESCAPE|BILLET(TERIE)?|ENTREE)\b/],
];

// Suggestion seulement a partir de l'enseigne ou de mots tres explicites ; sinon "A classer".
export function guessCategory(text: string): ExpenseCategory | null {
  const hits = CATEGORY_HINTS.filter(([, re]) => re.test(text)).map(([c]) => c);
  return hits.length === 1 ? hits[0] : null;
}

export function parseMerchant(rawLines: string[]): string | null {
  for (const raw of rawLines.slice(0, 6)) {
    const l = raw.trim();
    const letters = (l.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
    if (letters < 3 || letters < l.length * 0.6) continue;
    if (/^(TICKET|FACTURE|BIENVENUE|MERCI|CAISSE)\b/i.test(l)) continue;
    return l.replace(/\s{2,}/g, " ").slice(0, 40);
  }
  return null;
}

export function parseReceiptText(text: string, today: Date = new Date()): ParsedReceipt {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const lines = rawLines.map(norm);
  const all = lines.join("\n");
  return {
    date: parseDate(all, today),
    merchant: parseMerchant(rawLines),
    amount: parseAmount(lines),
    category: guessCategory(all),
    payment_method: parsePayment(all),
  };
}
