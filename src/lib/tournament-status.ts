const CANCELLED_STATUS = "cancelled";

export const TOURNAMENT_CANCELLED_ROUTE = "/cancelado";

export function isTournamentCancelledMode() {
  return process.env.TOURNAMENT_PUBLIC_STATUS?.trim().toLowerCase() === CANCELLED_STATUS;
}
