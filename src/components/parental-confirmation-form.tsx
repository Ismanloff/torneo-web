"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CircleCheckBig } from "lucide-react";

import { getSameOriginMutationHeaders } from "@/lib/security";
import { isExpired } from "@/lib/utils";

export function ParentalConfirmationForm({
  token,
  status,
  expiresAt,
}: {
  token: string;
  status: string;
  expiresAt: string | null;
}) {
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(status === "confirmed");
  const [isPending, startTransition] = useTransition();

  const expired = isExpired(expiresAt);

  async function submitConfirmation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/confirm-parental", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSameOriginMutationHeaders(),
        },
        body: JSON.stringify({
          token,
          parentName,
          parentPhone,
          parentEmail,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "No se ha podido confirmar la autorizacion.");
        return;
      }

      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--signal)]">
          Autorizacion completada
        </p>
        <CircleCheckBig className="h-10 w-10 text-[var(--signal)]" />
        <h2 className="font-display text-5xl uppercase leading-none">
          Confirmacion guardada
        </h2>
        <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
          La autorizacion se ha registrado en el sistema y el equipo ya aparece como confirmado.
        </p>
        <Link className="link-pill" href="/">
          Volver al portal
        </Link>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--signal)]">
          Enlace caducado
        </p>
        <h2 className="font-display text-5xl uppercase leading-none">
          La autorizacion ya no esta disponible
        </h2>
        <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
          Hace falta generar un nuevo enlace desde el panel interno o registrar de nuevo al equipo.
        </p>
        <Link className="link-pill" href="/">
          Volver al portal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--signal)]">
          Formulario de autorizacion
        </p>
        <h2 className="font-display text-5xl uppercase leading-none">
          Firma del tutor legal
        </h2>
        <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
          Completa los datos para dejar constancia de la autorizacion de participacion.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={submitConfirmation}>
        <label className="field-shell">
          <span className="field-label">Nombre del tutor</span>
          <input
            className="field-input"
            value={parentName}
            onChange={(event) => setParentName(event.target.value)}
            placeholder="Nombre y apellidos"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field-shell">
            <span className="field-label">Telefono</span>
            <input
              className="field-input"
              value={parentPhone}
              onChange={(event) => setParentPhone(event.target.value)}
              placeholder="600 123 123"
            />
          </label>
          <label className="field-shell">
            <span className="field-label">Correo</span>
            <input
              className="field-input"
              type="email"
              value={parentEmail}
              onChange={(event) => setParentEmail(event.target.value)}
              placeholder="familia@correo.es"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-[1.25rem] border border-[var(--signal)] bg-[#fff0eb] px-4 py-4 text-sm text-[var(--signal)]">
            {error}
          </div>
        ) : null}

        <button className="action-button action-button--signal" disabled={isPending} type="submit">
          <ArrowRight className="h-4 w-4" />
          {isPending ? "Guardando..." : "Confirmar autorizacion"}
        </button>
      </form>
    </div>
  );
}
