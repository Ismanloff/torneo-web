"use client";

import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { registerTeamAction } from "@/app/registro/actions";

type TeamRegistrationFormProps = {
  categoryId: string;
  categoryName: string;
  sport: string;
};

export function TeamRegistrationForm({
  categoryId,
  categoryName,
  sport,
}: TeamRegistrationFormProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(141,246,95,0.2)] bg-gradient-to-br from-[rgba(141,246,95,0.2)] to-[rgba(84,209,43,0.08)]">
            <ClipboardList className="h-4.5 w-4.5 text-[var(--app-accent)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{categoryName}</p>
            <p className="text-xs text-[#a8b7d2]">{sport}</p>
          </div>
        </div>
      </div>

      {error === "registro" ? (
        <div className="rounded-[1.4rem] border border-[rgba(255,107,107,0.28)] bg-[rgba(127,29,29,0.2)] px-4 py-3 text-sm text-[#fecaca]">
          Ha ocurrido un error al procesar la inscripcion. Revisa los datos e intentalo de nuevo.
        </div>
      ) : null}

      <form action={registerTeamAction} className="grid gap-5">
        <input type="hidden" name="categoryId" value={categoryId} />

        <label className="field-shell">
          <span className="field-label field-label--dark">Nombre del equipo</span>
          <input
            required
            className="field-input field-input--dark"
            name="teamName"
            placeholder="Ej: Los Tigres"
            type="text"
            minLength={3}
            maxLength={80}
          />
        </label>

        <label className="field-shell">
          <span className="field-label field-label--dark">Nombre del responsable</span>
          <input
            required
            className="field-input field-input--dark"
            name="captainName"
            placeholder="Nombre del responsable"
            type="text"
            minLength={2}
            maxLength={120}
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field-shell">
            <span className="field-label field-label--dark">Correo electronico</span>
            <input
              required
              className="field-input field-input--dark"
              name="captainEmail"
              placeholder="correo@ejemplo.com"
              type="email"
              maxLength={120}
            />
          </label>

          <label className="field-shell">
            <span className="field-label field-label--dark">Telefono</span>
            <input
              required
              className="field-input field-input--dark"
              name="captainPhone"
              placeholder="612 345 678"
              type="tel"
              minLength={6}
              maxLength={20}
            />
          </label>
        </div>

        <label className="field-shell">
          <span className="field-label field-label--dark">Numero de jugadores</span>
          <input
            required
            className="field-input field-input--dark"
            name="totalPlayers"
            placeholder="Numero de jugadores"
            type="number"
            min={1}
            max={30}
          />
        </label>

        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              required
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--app-accent)]"
              name="gdprConsent"
              type="checkbox"
            />
            <span className="text-sm text-[#a8b7d2]">
              Acepto el tratamiento de datos personales
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              required
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--app-accent)]"
              name="regulationAccepted"
              type="checkbox"
            />
            <span className="text-sm text-[#a8b7d2]">
              Acepto el reglamento del torneo
            </span>
          </label>
        </div>

        <button className="public-action mt-2 w-full cursor-pointer" type="submit">
          Inscribir equipo
        </button>
      </form>
    </div>
  );
}
