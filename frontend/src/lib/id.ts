// Identifiant unique local (horodatage + aleatoire), ex. "exp-lx3k9f2a8b".
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
