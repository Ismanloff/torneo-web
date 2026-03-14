import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import type { CategoryGroup } from "@/lib/types";

export function CategoryGrid({ groups }: { groups: CategoryGroup[] }) {
  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <section key={group.sport} className="panel">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--signal)]">
                {group.sport}
              </p>
              <h3 className="mt-2 font-display text-4xl uppercase leading-none">
                {group.categories.length} categorias
              </h3>
            </div>
            <div className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              {group.categories.reduce((acc, item) => acc + item.remainingSlots, 0)} plazas libres
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {group.categories.map((category) => (
              <article
                key={category.id}
                className="rounded-[1.5rem] border border-[var(--line)] bg-white/78 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{category.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {category.ageMin} a {category.ageMax} anos · {category.ageGroup}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {category.remainingSlots} libres
                  </span>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Users className="h-4 w-4" />
                    <span>
                      {category.registeredTeams} / {category.maxTeams} equipos
                    </span>
                  </div>
                  {category.remainingSlots === 0 ? (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)] opacity-60">
                      Completo
                    </span>
                  ) : (
                    <Link
                      href={`/registro/${category.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--signal)]"
                    >
                      Inscribir
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
