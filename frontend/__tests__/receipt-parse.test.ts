/// <reference types="jest" />
// Lecture des tickets (texte OCR -> champs). Lancer : npx jest
import { parseAmount, parseDate, parsePayment, parseReceiptText, rowsFromLines } from "@/src/lib/receipt-parse";

const TODAY = new Date(2026, 9, 28);

const TICKET_CB = `CARREFOUR MARKET
12 RUE DES LILAS
75011 PARIS
LAIT DEMI ECREME        1,15
PAIN DE MIE             2,49
LESSIVE                 6,90
SOUS-TOTAL             10,54
TOTAL TTC              10,54 EUR
TVA 5.5%                0,40
CB SANS CONTACT        10,54
LE 27/10/2026 A 18:42`;

const TICKET_ESP = `Boulangerie Martin
Baguette tradition   1,30
Croissant x4         4,80
A PAYER              6,10
ESPECES             10,00
RENDU                3,90
26.10.26 08:12`;

describe("lecture de ticket", () => {
  it("ticket carte complet", () => {
    expect(parseReceiptText(TICKET_CB, TODAY)).toEqual({
      date: "2026-10-27",
      merchant: "CARREFOUR MARKET",
      amount: 10.54,
      category: "alimentation",
      payment_method: "carte",
    });
  });

  it("ticket espèces : le total n'est pas le montant donné ni le rendu", () => {
    const r = parseReceiptText(TICKET_ESP, TODAY);
    expect(r.amount).toBe(6.1);
    expect(r.payment_method).toBe("especes");
    expect(r.date).toBe("2026-10-26");
    expect(r.merchant).toBe("Boulangerie Martin");
  });

  it("montant sur la ligne suivant TOTAL", () => {
    expect(parseAmount(["TOTAL", "23,40", "MERCI"])).toBe(23.4);
  });

  it("ignore TVA, sous-total et remises", () => {
    expect(parseAmount(["SOUS-TOTAL 50,00", "REMISE TOTAL 5,00", "TOTAL TVA 2,00"])).toBeNull();
  });

  it("paiement ambigu ou absent : à vérifier", () => {
    expect(parsePayment("CB 10,00\nESPECES 5,00")).toBeNull();
    expect(parsePayment("TOTAL 10,00")).toBeNull();
  });

  it("dates invalides, futures ou trop anciennes refusées", () => {
    expect(parseDate("31/02/2026", TODAY)).toBeNull();
    expect(parseDate("15/12/2026", TODAY)).toBeNull();
    expect(parseDate("01/01/2020", TODAY)).toBeNull();
  });

  it("enseigne inconnue : motif à classer", () => {
    expect(parseReceiptText("MAGASIN XYZ\nTOTAL 12,00", TODAY).category).toBeNull();
  });
});

describe("reconstitution des lignes (OCR natif par colonnes)", () => {
  it("rapproche libellé et montant lus séparément", () => {
    // Colonne de gauche puis colonne de droite, comme ML Kit les renvoie souvent
    const lines = [
      { text: "SUPER U", left: 10, top: 0, bottom: 20 },
      { text: "TOTAL TTC", left: 10, top: 100, bottom: 120 },
      { text: "TVA 5,5%", left: 10, top: 130, bottom: 150 },
      { text: "CB SANS CONTACT", left: 10, top: 160, bottom: 180 },
      { text: "10,54", left: 300, top: 103, bottom: 121 }, // légère inclinaison
      { text: "0,40", left: 300, top: 132, bottom: 151 },
      { text: "10,54", left: 300, top: 161, bottom: 181 },
    ];
    expect(rowsFromLines(lines)).toEqual(["SUPER U", "TOTAL TTC  10,54", "TVA 5,5%  0,40", "CB SANS CONTACT  10,54"]);
    expect(parseReceiptText(rowsFromLines(lines).join("\n"), TODAY).amount).toBe(10.54);
  });
});
