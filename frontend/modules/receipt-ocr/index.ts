// Pont vers le module natif Android (voir android/.../ReceiptOcrModule.kt).
import { requireOptionalNativeModule } from "expo";

export interface OcrLine {
  text: string;
  left: number;
  top: number;
  bottom: number;
}

const Native = requireOptionalNativeModule<{ recognize(uri: string): Promise<OcrLine[]> }>("ReceiptOcr");

export function recognize(uri: string): Promise<OcrLine[]> {
  if (!Native) return Promise.reject(new Error("Lecture des tickets non disponible sur cet appareil"));
  return Native.recognize(uri);
}
