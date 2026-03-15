import { normalizeSportName } from "@/lib/allowed-sports";

export function getScoreMetricLabel(sport: string) {
  const normalized = normalizeSportName(sport);

  if (normalized === "futbol") {
    return "Goles";
  }

  return "Puntos";
}

export function getScoreMetricLabelLower(sport: string) {
  return getScoreMetricLabel(sport).toLowerCase();
}

export function getScoreMetricSingularLower(sport: string) {
  const normalized = normalizeSportName(sport);

  if (normalized === "futbol") {
    return "gol";
  }

  return "punto";
}
