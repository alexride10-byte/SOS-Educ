// Justificatifs (photos de tickets) dans le navigateur : IndexedDB, sur l'appareil uniquement.
// Les URI "blob:" donnees par l'appareil photo ne survivent pas a un rechargement : on stocke
// une copie reduite (JPEG ~1600 px) et on reference la photo par "idb:<id>".
const DB = "caresync-photos";
const STORE = "photos";
const PREFIX = "idb:";

export const isStoredPhoto = (uri: string) => uri.startsWith(PREFIX);

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function shrink(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? blob), "image/jpeg", 0.75));
  } catch {
    return blob;
  }
}

async function putBlob(blob: Blob): Promise<string> {
  const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await tx("readwrite", (s) => s.put(blob, id));
  return PREFIX + id;
}

async function getBlob(uri: string): Promise<Blob | null> {
  if (!isStoredPhoto(uri)) return null;
  return (await tx<Blob | undefined>("readonly", (s) => s.get(uri.slice(PREFIX.length)))) ?? null;
}

export async function storePhoto(uri: string): Promise<string> {
  if (isStoredPhoto(uri)) return uri;
  const blob = await (await fetch(uri)).blob();
  return putBlob(await shrink(blob));
}

const blobToDataUri = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

export async function photoDataUri(uri: string): Promise<string | null> {
  const b = await getBlob(uri).catch(() => null);
  return b ? blobToDataUri(b) : null;
}

const displayCache = new Map<string, string>();
export async function photoDisplayUri(uri: string): Promise<string | null> {
  if (!isStoredPhoto(uri)) return uri;
  if (!displayCache.has(uri)) {
    const b = await getBlob(uri).catch(() => null);
    if (!b) return null;
    displayCache.set(uri, URL.createObjectURL(b));
  }
  return displayCache.get(uri)!;
}

export async function restorePhoto(dataUri: string): Promise<string> {
  return putBlob(await (await fetch(dataUri)).blob());
}

export async function deletePhoto(uri?: string) {
  if (!uri || !isStoredPhoto(uri)) return;
  await tx("readwrite", (s) => s.delete(uri.slice(PREFIX.length))).catch(() => {});
}

export async function clearPhotos() {
  await tx("readwrite", (s) => s.clear()).catch(() => {});
}
