// Prefixe de publication (ex. "/SOS-Educ" sur GitHub Pages), fixe au moment du build.
export const BASE_URL = (process.env.EXPO_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

// URL absolue d'un fichier du dossier public/
export function appUrl(path: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${BASE_URL}/${path.replace(/^\//, "")}`;
}
