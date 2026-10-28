// OCR local dans le navigateur (Tesseract, langue francaise). La photo ne quitte jamais l'appareil :
// le moteur et le modele sont servis par l'application elle-meme (dossier public/tesseract),
// puis mis en cache. Le texte lu est interprete par receipt-parse (aucune IA distante).
import { appUrl } from "./base-url";
import { ParsedReceipt, parseReceiptText } from "./receipt-parse";

export type ReceiptOcr = ParsedReceipt;

type TesseractWorker = { recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }> };

let workerPromise: Promise<TesseractWorker> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Moteur OCR introuvable"));
    document.head.appendChild(s);
  });
}

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      await loadScript(appUrl("tesseract/tesseract.min.js"));
      const T = (window as any).Tesseract;
      return T.createWorker("fra", 1 /* LSTM uniquement */, {
        workerPath: appUrl("tesseract/worker.min.js"),
        corePath: appUrl("tesseract/core"),
        langPath: appUrl("tesseract/lang"),
        workerBlobURL: false,
      });
    })();
    workerPromise.catch(() => {
      workerPromise = null; // nouvel essai possible au prochain ticket
    });
  }
  return workerPromise;
}

// Reduction + niveaux de gris : lecture plus rapide et plus fiable sur telephone
async function prepare(uri: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = uri;
  await img.decode();
  const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.filter = "grayscale(1) contrast(1.3)";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function ocrReceipt(image: { uri: string }): Promise<ReceiptOcr> {
  const [worker, canvas] = await Promise.all([getWorker(), prepare(image.uri)]);
  const { data } = await worker.recognize(canvas);
  return parseReceiptText(data.text);
}
