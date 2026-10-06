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
