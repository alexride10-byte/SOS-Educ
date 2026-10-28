// Justificatifs (photos de tickets) sur telephone natif : dossier documents prive de l'app.
// Meme API que photo-store.web.ts (IndexedDB du navigateur).
import { Directory, File, Paths } from "expo-file-system";

const DIR = "justificatifs";

export const isStoredPhoto = (uri: string) => uri.includes(`/${DIR}/`);

// Copie la photo du cache (purgeable par le systeme) vers le dossier prive. Retourne l'URI conservee.
export async function storePhoto(uri: string): Promise<string> {
  if (isStoredPhoto(uri)) return uri;
  const dir = new Directory(Paths.document, DIR);
  if (!dir.exists) dir.create({ idempotent: true });
  const dest = new File(dir, `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`);
  new File(uri).copySync(dest);
  return dest.uri;
}

export async function photoDataUri(uri: string): Promise<string | null> {
  try {
    const f = new File(uri);
    return f.exists ? `data:image/jpeg;base64,${await f.base64()}` : null;
  } catch {
    return null;
  }
}

export async function photoDisplayUri(uri: string): Promise<string | null> {
  return uri;
}

export async function restorePhoto(dataUri: string): Promise<string> {
  const dir = new Directory(Paths.document, DIR);
  if (!dir.exists) dir.create({ idempotent: true });
  const dest = new File(dir, `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`);
  dest.create({ overwrite: true });
  dest.write(dataUri.split(",")[1] ?? "", { encoding: "base64" });
  return dest.uri;
}

export async function deletePhoto(uri?: string) {
  if (!uri || !isStoredPhoto(uri)) return;
  try {
    new File(uri).delete();
  } catch {}
}

export async function clearPhotos() {
  try {
    const dir = new Directory(Paths.document, DIR);
    if (dir.exists) dir.delete();
  } catch {}
}
