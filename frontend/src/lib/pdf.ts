// Generation PDF locale (via expo-print + partage via expo-sharing).
// Sur le web : impression du navigateur ("Enregistrer en PDF"), voir print-html.web.ts.
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { computeBudget, fmtEur, round2 } from "./money";
import { photoDataUri } from "./photo-store";
import { printHtmlWeb } from "./print-html";
import { EXPENSE_CATEGORIES, Expense, PaymentMethod, Session, paymentLabel } from "@/src/types";

function esc(s: string | number | null | undefined) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const frDate = (iso: string) => iso.split("-").reverse().join("/");

function catLabel(k: string | null) {
  if (!k) return "À classer";
  return EXPENSE_CATEGORIES.find((c) => c.key === k)?.label ?? k;
}
function payLabel(k: PaymentMethod | null) {
  return paymentLabel(k);
}

export async function exportSessionPdf(session: Session, expenses: Expense[]) {
  const items = expenses.filter((e) => e.sessionId === session.id);
  const b = computeBudget(session, items);
  const total = b.total;
  const byPay = (p: "especes" | "carte" | null) =>
    round2(
      items
        .filter((e) => (p ? e.paymentMethod === p : e.paymentMethod !== "especes" && e.paymentMethod !== "carte"))
        .reduce((sum, e) => sum + e.amount, 0),
    );

  // Totaux par categorie (depenses classees uniquement)
  const byCat: Record<string, number> = {};
  for (const c of b.byCategory) if (c.amount > 0) byCat[c.key] = c.amount;

  // Justificatifs integres en base64 (fiable sur Android et iOS, pas de lien vers un fichier externe)
  const photoData: Record<string, string> = {};
  for (const e of items) {
    if (!e.photoUri) continue;
    const data = await photoDataUri(e.photoUri); // null = photo introuvable, signalee dans le tableau
    if (data) photoData[e.id] = data;
  }

  const rows = items
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (e) => `
      <tr>
        <td>${esc(frDate(e.date))}</td>
        <td>${esc(e.merchant)}</td>
        <td>${esc(catLabel(e.category))}</td>
        <td>${esc(payLabel(e.paymentMethod))}</td>
        <td style="text-align:right;">${esc(e.amount.toFixed(2))} &euro;</td>
        <td>${e.photoUri ? (photoData[e.id] ? "Oui" : "Introuvable") : "Non"}</td>
      </tr>`,
    )
    .join("");

  const photos = items
    .filter((e) => !!photoData[e.id])
    .map(
      (e) => `
      <div style="page-break-before: always; padding-top:8px;">
        <div style="font-size:12px;color:#374151;margin-bottom:6px;">
          ${esc(frDate(e.date))} &middot; ${esc(e.merchant)} &middot; ${esc(e.amount.toFixed(2))} &euro;
        </div>
        <img src="${photoData[e.id]}" style="max-width:100%;max-height:880px;border:1px solid #e5e7eb;border-radius:8px;" />
      </div>`,
    )
    .join("");

  const catRows = Object.entries(byCat)
    .map(
      ([k, v]) =>
        `<tr><td>${esc(catLabel(k))}</td><td style="text-align:right;">${esc(v.toFixed(2))} &euro;</td></tr>`,
    )
    .join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(session.label)}</title>
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color:#111827; padding:24px; }
      h1 { font-size:22px; margin:0 0 4px; }
      h2 { font-size:16px; margin:24px 0 8px; color:#0F766E; }
      .muted { color:#6B7280; font-size:12px; }
      table { width:100%; border-collapse: collapse; margin-top:8px; font-size:12px; }
      th, td { padding:8px 10px; border-bottom:1px solid #e5e7eb; text-align:left; }
      th { background:#F3F4F6; }
      .total { font-size:16px; font-weight:600; margin-top:12px; }
      .pill { display:inline-block; padding:4px 10px; border-radius:999px; background:#CCFBF1; color:#0F766E; font-size:12px; }
    </style>
  </head>
  <body>
    <h1>${esc(session.label)}</h1>
    <div class="muted">Du ${esc(frDate(session.startDate))}${session.endDate ? ` au ${esc(frDate(session.endDate))}` : ""}</div>
    <div style="margin-top:8px;"><span class="pill">${items.length} dépense(s)</span></div>

    <h2>Synthèse</h2>
    <table>
      <tbody>
        <tr><td>Report de la session précédente</td><td style="text-align:right;">${esc(fmtEur(b.carryOver))}</td></tr>
        <tr><td>Budget initial</td><td style="text-align:right;">${esc(fmtEur(b.initial))}</td></tr>
        <tr><td>Ajouts exceptionnels</td><td style="text-align:right;">${esc(fmtEur(b.additionsTotal))}</td></tr>
        <tr><td><b>Budget disponible</b></td><td style="text-align:right;"><b>${esc(fmtEur(b.available))}</b></td></tr>
        <tr><td>Total des dépenses</td><td style="text-align:right;">${esc(fmtEur(total))}</td></tr>
        <tr><td class="muted">dont payé en espèces (ESP)</td><td style="text-align:right;" class="muted">${esc(fmtEur(byPay("especes")))}</td></tr>
        <tr><td class="muted">dont payé par carte (CB)</td><td style="text-align:right;" class="muted">${esc(fmtEur(byPay("carte")))}</td></tr>
        ${byPay(null) > 0 ? `<tr><td class="muted">dont paiement à vérifier</td><td style="text-align:right;" class="muted">${esc(fmtEur(byPay(null)))}</td></tr>` : ""}
        <tr><td><b>Solde restant</b></td><td style="text-align:right;"><b>${esc(fmtEur(b.remaining))}</b></td></tr>
        ${(session.additions ?? []).map((a) => `<tr><td class="muted">Ajout du ${esc(new Date(a.date).toLocaleDateString("fr-FR"))}${a.reason ? ` (${esc(a.reason)})` : ""}</td><td style="text-align:right;" class="muted">+${esc(fmtEur(a.amount))}</td></tr>`).join("")}
        ${session.closure ? `<tr><td>Clôture</td><td style="text-align:right;">${esc(new Date(session.closure.closedAt).toLocaleDateString("fr-FR"))} · solde final ${esc(fmtEur(session.closure.finalBalance))}</td></tr>` : ""}
        <tr><td>Dépenses à classer</td><td style="text-align:right;">${b.unclassifiedCount} (${esc(fmtEur(b.unclassifiedTotal))})</td></tr>
      </tbody>
    </table>
    <div class="total">Total: ${esc(fmtEur(total))}</div>
    <table>
      <thead><tr><th>Motif (dépenses classées)</th><th style="text-align:right;">Total</th></tr></thead>
      <tbody>${catRows || `<tr><td colspan="2" class="muted">Aucune dépense</td></tr>`}</tbody>
    </table>

    <h2>Détail des dépenses</h2>
    <table>
      <thead>
        <tr><th>Date</th><th>Enseigne</th><th>Motif</th><th>Paiement</th><th style="text-align:right;">Montant</th><th>Justificatif</th></tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6" class="muted">Aucune dépense</td></tr>`}</tbody>
    </table>

    ${photos ? `<h2>Justificatifs</h2>${photos}` : ""}
  </body>
  </html>`;

  if (Platform.OS === "web") {
    await printHtmlWeb(html);
    return null;
  }
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: session.label });
  }
  return uri;
}
