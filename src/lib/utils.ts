import type { MatchQrTokenRow } from "@/lib/types";

export const TOURNAMENT_PUBLIC_URL =
  process.env.TOURNAMENT_PUBLIC_URL?.trim() ||
  process.env.NEXT_PUBLIC_TOURNAMENT_PUBLIC_URL?.trim() ||
  "https://torneo.eloos.es";

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function slugToCode(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 18)
    .toUpperCase();
}

export function isExpired(value: string | null) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() < Date.now();
}

export function formatDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function buildQrTargetPath(token: Pick<MatchQrTokenRow, "resource_id" | "resource_type">) {
  if (token.resource_type === "team") {
    return `/app/equipo/${token.resource_id}`;
  }

  return `/app/partido/${token.resource_id}?scope=${token.resource_type}`;
}

export function buildPublicQrTargetPath(
  token: Pick<MatchQrTokenRow, "resource_id" | "resource_type" | "token">,
) {
  if (token.resource_type === "team") {
    return `/seguimiento/equipo/${token.resource_id}?token=${token.token}`;
  }

  return `/seguimiento/partido/${token.resource_id}?scope=${token.resource_type}&token=${token.token}`;
}

export function buildQrShareUrl(token: string) {
  return new URL(`/q/${token}`, TOURNAMENT_PUBLIC_URL).toString();
}

export function formatStaffRoleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "referee") return "Arbitro";
  if (role === "assistant") return "Organizacion";
  return role;
}
