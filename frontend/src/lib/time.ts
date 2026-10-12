// Calcul heure de depart recommandee.
export function computeDeparture(timeHHmm: string, travelMin: number, bufferMin: number): string {
  const [h, m] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  d.setMinutes(d.getMinutes() - (travelMin || 0) - (bufferMin || 0));
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatDateFr(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

// Date locale (evite le decalage UTC de toISOString)
export function localIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseLocal(dateIso: string, timeHHmm = "00:00"): Date {
  const [y, mo, d] = dateIso.split("-").map((x) => parseInt(x, 10));
  const [h, m] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, m || 0, 0, 0);
}

export function dayBefore(dateIso: string): string {
  const d = parseLocal(dateIso);
  d.setDate(d.getDate() - 1);
  return localIso(d);
}

export function departureExplanation(timeHHmm: string, travelMin: number, bufferMin: number): string {
  return `RDV ${timeHHmm} − ${travelMin || 0} min de trajet − ${bufferMin || 0} min de marge = départ à ${computeDeparture(timeHHmm, travelMin, bufferMin)}`;
}
