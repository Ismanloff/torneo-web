import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PublicBrandLockup } from "@/components/public-brand-lockup";
import { PublicSiteNav } from "@/components/public-site-nav";

type PublicPageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  compactHero?: boolean;
  children: React.ReactNode;
};

export function PublicPageShell({
  eyebrow,
  title,
  description,
  backHref = "/",
  backLabel = "Volver al portal",
  actions,
  compactHero = false,
  children,
}: PublicPageShellProps) {
  return (
    <main className="public-arena">
      <div className="public-shell">
        <header className="public-topbar">
          <div className="public-wrap">
            <div className="public-topbar__inner">
              <PublicBrandLockup />

              <PublicSiteNav />
            </div>
          </div>
        </header>

        <section className={`public-hero ${compactHero ? "public-hero--compact" : ""}`}>
          <div className={`public-wrap ${compactHero ? "py-7 lg:py-9" : "py-10 lg:py-14"}`}>
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="public-glass p-6 lg:p-8">
                <Link className="public-tag" href={backHref}>
                  <ChevronLeft className="h-4 w-4" />
                  {backLabel}
                </Link>
                <p className={`${compactHero ? "mt-5" : "mt-8"} public-kicker`}>{eyebrow}</p>
                <h1 className={`public-title mt-4 ${compactHero ? "text-[2.7rem] sm:text-5xl lg:text-6xl" : "text-4xl sm:text-6xl lg:text-7xl"}`}>{title}</h1>
                {description ? <p className={`public-copy ${compactHero ? "mt-4 text-sm sm:text-base" : "mt-5 text-base"} max-w-3xl`}>{description}</p> : null}
              </article>

              {actions ? <aside className="public-glass p-6 lg:p-8">{actions}</aside> : null}
            </div>
          </div>
        </section>

        <section className="public-section pt-8">
          <div className="public-wrap grid gap-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
