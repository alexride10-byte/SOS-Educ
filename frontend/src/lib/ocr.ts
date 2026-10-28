// OCR sur telephone natif : non disponible dans ce MVP (la version web lit le ticket localement,
// voir ocr.web.ts). L'ancien envoi de la photo a un service d'IA distant est retire (RGPD).
// La saisie manuelle reste toujours possible.
import { ParsedReceipt } from "./receipt-parse";

export type ReceiptOcr = ParsedReceipt;

export async function ocrReceipt(_image: { uri: string }): Promise<ReceiptOcr> {
  throw new Error("OCR non disponible sur cette plateforme");
}
