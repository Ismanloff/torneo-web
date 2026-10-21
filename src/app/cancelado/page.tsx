import type { Metadata } from "next";
import { CalendarX2, MessageSquareWarning, ShieldAlert } from "lucide-react";

import { PublicBrandLockup } from "@/components/public-brand-lockup";
import {
  TOURNAMENT_EVENT_DATE_LABEL,
  TOURNAMENT_NAME,
  TOURNAMENT_ORGANIZERS_LABEL,
} from "@/lib/branding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Torneo cancelado | ${TOURNAMENT_NAME}`,
  description:
    "El torneo queda cancelado por falta de equipos inscritos. La organización informará si se abre una nueva fecha más adelante.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CancelledTournamentPage() {
  return (
    <main className="public-arena">
      <div className="public-shell">
        <header className="public-topbar">
          <div className="public-wrap">
            <div className="public-topbar__inner">
              <PublicBrandLockup />
            </div>
          </div>
        </header>

        <section className="public-hero">
          <div className="public-wrap py-10 lg:py-14">
            <article className="public-glass mx-auto max-w-4xl overflow-hidden p-0">
              <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="p-7 lg:p-10">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="public-tag public-tag--soft">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Aviso oficial
                    </span>
                    <span className="public-tag public-tag--accent">
                      <CalendarX2 className="h-3.5 w-3.5" />
                      {TOURNAMENT_EVENT_DATE_LABEL}
                    </span>
                  </div>

                  <p className="public-kicker">Comunicado de la organización</p>
                  <h1 className="public-title mt-4 text-5xl sm:text-6xl">
                    El torneo queda cancelado
                  </h1>
                  <p className="public-copy mt-5 max-w-2xl text-base">
                    El evento previsto para el 18 de abril se cancela por falta de equipos
                    inscritos. Si más adelante se organiza una nueva fecha, la comunicaremos por
                    los canales habituales.
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#b7c2b0]">
                    {TOURNAMENT_ORGANIZERS_LABEL}
                  </p>
                </div>

                <div className="border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(125,29,29,0.22),rgba(14,19,31,0.9))] p-7 lg:border-t-0 lg:border-l lg:border-white/[0.08] lg:p-10">
                  <div className="rounded-[1.8rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(8,12,18,0.45)] p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5c4c4]">
                      Qué debes tener en cuenta
                    </p>
                    <div className="mt-5 space-y-4 text-sm leading-7 text-[#e6edf8]">
                      <div className="flex gap-3">
                        <MessageSquareWarning className="mt-1 h-4 w-4 shrink-0 text-[#f0a4a4]" />
                        <p>
                          Los equipos ya inscritos están siendo avisados directamente por la
                          organización.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <MessageSquareWarning className="mt-1 h-4 w-4 shrink-0 text-[#f0a4a4]" />
                        <p>
                          Las inscripciones nuevas quedan cerradas hasta nuevo aviso.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <MessageSquareWarning className="mt-1 h-4 w-4 shrink-0 text-[#f0a4a4]" />
                        <p>
                          Si se abre una nueva convocatoria, se publicará aquí mismo.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
