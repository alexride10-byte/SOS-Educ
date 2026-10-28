// OCR sur telephone (Android) : Google ML Kit avec le modele latin embarque dans l'appli
// (modules/receipt-ocr). La photo est lue sur l'appareil, rien n'est envoye.
// Version web : ocr.web.ts. La saisie manuelle reste toujours possible.
import { recognize } from "@/modules/receipt-ocr";
import { ParsedReceipt, parseReceiptText, rowsFromLines } from "./receipt-parse";

export type ReceiptOcr = ParsedReceipt;

export async function ocrReceipt(image: { uri: string }): Promise<ReceiptOcr> {
  const lines = await recognize(image.uri);
  return parseReceiptText(rowsFromLines(lines).join("\n"));
}
