import { normalizeSportName } from "@/lib/allowed-sports";

type CompletedScoreValidationInput = {
  sport: string;
  homeScore: number | null;
  awayScore: number | null;
};

function isResolvedWithWinnerSport(sport: string) {
  const normalized = normalizeSportName(sport);
  return normalized === "futbol" || normalized === "baloncesto";
}

export function isVolleyballSport(sport: string) {
  return normalizeSportName(sport) === "voleibol";
}

export function validateCompletedScore({
  sport,
  homeScore,
  awayScore,
}: CompletedScoreValidationInput) {
  if (homeScore === null || awayScore === null) {
    return "Debes registrar ambos marcadores antes de cerrar el partido.";
  }

  if (isResolvedWithWinnerSport(sport) && homeScore === awayScore) {
    return "En fútbol y baloncesto debe quedar un ganador final tras penaltis o tiros libres.";
  }

  if (isVolleyballSport(sport)) {
    const validHomeWin =
      homeScore === 2 && (awayScore === 0 || awayScore === 1);
    const validAwayWin =
      awayScore === 2 && (homeScore === 0 || homeScore === 1);

    if (!validHomeWin && !validAwayWin) {
      return "En voleibol el resultado debe expresarse por sets ganados: 2-0 o 2-1.";
    }
  }

  return null;
}
