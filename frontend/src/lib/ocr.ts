// Appels OCR vers le backend. Fonctionne seulement en ligne.
// Toutes les autres fonctions de l'app marchent hors-ligne.

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface ReceiptOcr {
  date?: string | null;
  merchant?: string | null;
  amount?: number | null;
  category?: string | null;
}

export interface OdometerOcr {
  kilometers?: number | null;
}

export async function ocrReceipt(base64: string, mimeType = "image/jpeg"): Promise<ReceiptOcr> {
  const res = await fetch(`${BASE}/api/ocr/receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
  });
  if (!res.ok) throw new Error(`OCR receipt failed: ${res.status}`);
  return res.json();
}

export async function ocrOdometer(base64: string, mimeType = "image/jpeg"): Promise<OdometerOcr> {
  const res = await fetch(`${BASE}/api/ocr/odometer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
  });
  if (!res.ok) throw new Error(`OCR odometer failed: ${res.status}`);
  return res.json();
}
