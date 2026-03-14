const ALLOWED_SPORT_KEYS = ["baloncesto", "futbol", "voleibol"] as const;

export const ALLOWED_SPORT_LABELS = ["Baloncesto", "Fútbol", "Voleibol"] as const;

export function normalizeSportName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isAllowedSport(value: string) {
  return ALLOWED_SPORT_KEYS.includes(
    normalizeSportName(value) as (typeof ALLOWED_SPORT_KEYS)[number],
  );
}
