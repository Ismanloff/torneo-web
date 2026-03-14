"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Settings2, Wifi, WifiOff } from "lucide-react";

import { submitMatchResultAction } from "@/app/admin/actions";
import { AdminModal } from "@/components/admin-modal";
import { queueOfflineScore } from "@/lib/offline-store";
import type { MatchScope } from "@/lib/types";

type OfflineScoreFormProps = {
  matchId: string;
  matchScope: MatchScope;
  categoryId: string;
  bracketId?: string | null;
  homeTeamName: string;
  awayTeamName: string;
  currentHomeScore: number | null;
  currentAwayScore: number | null;
  currentStatus: string;
  currentNotes: string | null;
  currentScheduledAt: string | null;
  currentLocation: string | null;
  actorRole: string;
  canSubmit: boolean;
};

export function OfflineScoreForm({
  matchId,
  matchScope,
  categoryId,
  bracketId,
  homeTeamName,
  awayTeamName,
  currentHomeScore,
  currentAwayScore,
  currentStatus,
  currentNotes,
  currentScheduledAt,
  currentLocation,
  actorRole,
  canSubmit,
}: OfflineScoreFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [scheduledAtValue, setScheduledAtValue] = useState(currentScheduledAt ?? "");
  const [locationValue, setLocationValue] = useState(currentLocation ?? "");
  const [notesValue, setNotesValue] = useState(currentNotes ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Listen for sync-complete messages from the service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "sync-complete") {
        router.refresh();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [router]);

  async function handleSubmit(formData: FormData) {
    if (!isOnline) {
      const rawHome = formData.get("homeScore") as string;
      const rawAway = formData.get("awayScore") as string;

      if (rawHome === "" || rawAway === "") {
        setOfflineSaved(false);
        alert("Introduce ambos marcadores antes de guardar.");
        return;
      }

      const homeScore = Number(rawHome);
      const awayScore = Number(rawAway);

      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        alert("Los marcadores deben ser numeros validos.");
        return;
      }

      // Offline queue intentionally stores only scores (homeScore/awayScore).
      // Fields like status, scheduledAt, location, and notes are not queued
      // because offline mode targets field referees who only need to record
      // match results. Full match editing is done online via the admin panel.
      await queueOfflineScore({
        id: crypto.randomUUID(),
        matchId,
        matchScope,
        homeScore,
        awayScore,
        actorRole,
        timestamp: Date.now(),
      });

      // Register background sync if available
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;

          if ("sync" in registration) {
            await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-scores");
          }
        } catch {
          // Background sync not supported or failed — scores remain in IndexedDB
        }
      }

      setOfflineSaved(true);
      setTimeout(() => setOfflineSaved(false), 4000);
      return;
    }

    // Online: use the server action
    startTransition(() => {
      submitMatchResultAction(formData);
    });
  }

  const redirectTo = `/app/partido/${matchId}?scope=${matchScope}`;

  if (!canSubmit) {
    return (
      <article className="app-panel-strong">
        <p className="app-kicker">Resultado final</p>
        <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.04em] text-white">
          Marcador reservado a arbitraje
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
          Tu perfil puede consultar estado, pista y contexto del partido, pero el resultado solo lo puede editar el arbitro asignado o un admin.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.04] p-4">
            <p className="app-metric__label">{homeTeamName}</p>
            <p className="font-mono mt-3 text-3xl font-semibold text-white">{currentHomeScore ?? "-"}</p>
          </div>
          <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.04] p-4">
            <p className="app-metric__label">{awayTeamName}</p>
            <p className="font-mono mt-3 text-3xl font-semibold text-white">{currentAwayScore ?? "-"}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="app-panel-strong">
      <div className="flex items-center justify-between">
        <p className="app-kicker">Resultado final</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            isOnline
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Offline
            </>
          )}
        </span>
      </div>

      <form ref={formRef} action={handleSubmit} className="mt-4 grid gap-3">
        <input name="scope" type="hidden" value={matchScope} />
        <input name="matchId" type="hidden" value={matchId} />
        <input name="categoryId" type="hidden" value={categoryId} />
        <input name="redirectTo" type="hidden" value={redirectTo} />
        {matchScope === "bracket_match" && bracketId ? (
          <input name="bracketId" type="hidden" value={bracketId} />
        ) : null}

        <div className="app-soft-card">
          <p className="text-sm leading-6 text-[var(--app-muted)]">
            Prioriza marcador y estado del partido. Pista, hora y notas quedan en detalles avanzados para no romper el flujo en pista.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[0.7fr_1fr]">
          <label className="field-shell">
            <span className="field-label field-label--dark">Estado</span>
            <select
              className="field-input field-input--dark"
              defaultValue={currentStatus}
              name="status"
            >
              <option value="scheduled">Programado</option>
              <option value="completed">Finalizado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field-shell">
              <span className="field-label field-label--dark">
                {homeTeamName}
              </span>
              <input
                className="field-input field-input--dark font-mono text-lg"
                defaultValue={currentHomeScore ?? ""}
                disabled={!canSubmit}
                name="homeScore"
                inputMode="numeric"
                type="number"
              />
            </label>
            <label className="field-shell">
              <span className="field-label field-label--dark">
                {awayTeamName}
              </span>
              <input
                className="field-input field-input--dark font-mono text-lg"
                defaultValue={currentAwayScore ?? ""}
                disabled={!canSubmit}
                name="awayScore"
                inputMode="numeric"
                type="number"
              />
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.04] p-4">
            <p className="app-metric__label">{homeTeamName}</p>
            <p className="font-mono mt-3 text-4xl font-semibold text-white">{currentHomeScore ?? "-"}</p>
          </div>
          <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.04] p-4">
            <p className="app-metric__label">{awayTeamName}</p>
            <p className="font-mono mt-3 text-4xl font-semibold text-white">{currentAwayScore ?? "-"}</p>
          </div>
        </div>

        <input name="scheduledAt" type="hidden" value={scheduledAtValue} />
        <input name="location" type="hidden" value={locationValue} />
        <input name="notes" type="hidden" value={notesValue} />

        {offlineSaved ? (
          <div className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white">
            <Check className="h-4 w-4" />
            Resultado guardado offline. Se sincronizara automaticamente.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            className={`app-action ${offlineSaved ? "bg-green-600 text-white" : ""}`}
            disabled={!canSubmit || isPending}
            type="submit"
          >
            {isPending
              ? "Guardando..."
              : offlineSaved
                ? "Guardado offline"
                : isOnline
                  ? "Guardar resultado"
                  : "Guardar offline"}
          </button>
          <button
            className="app-action app-action--ghost"
            onClick={() => setIsAdvancedOpen(true)}
            type="button"
          >
            <Settings2 className="h-4 w-4" />
            Detalles avanzados
          </button>
        </div>

        <AdminModal
          isOpen={isAdvancedOpen}
          onClose={() => setIsAdvancedOpen(false)}
          title="Detalles del partido"
        >
          <div className="grid gap-4">
            <label className="field-shell">
              <span className="field-label field-label--dark">Fecha y hora</span>
              <input
                className="field-input field-input--dark"
                onChange={(event) => setScheduledAtValue(event.target.value)}
                type="datetime-local"
                value={scheduledAtValue}
              />
            </label>
            <label className="field-shell">
              <span className="field-label field-label--dark">
                Cancha o pista
              </span>
              <input
                className="field-input field-input--dark"
                onChange={(event) => setLocationValue(event.target.value)}
                value={locationValue}
              />
            </label>
            <label className="field-shell">
              <span className="field-label field-label--dark">Notas</span>
              <textarea
                className="field-input field-input--dark min-h-24"
                onChange={(event) => setNotesValue(event.target.value)}
                value={notesValue}
              />
            </label>
            <div className="flex justify-end">
              <button className="admin-btn admin-btn--secondary" onClick={() => setIsAdvancedOpen(false)} type="button">
                Cerrar
              </button>
            </div>
          </div>
        </AdminModal>
      </form>
    </article>
  );
}
