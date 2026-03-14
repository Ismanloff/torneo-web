import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";

type PublicPageShellProps = {
  eyebrow: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function PublicPageShell({
  eyebrow,
  title,
  description,
  backHref = "/",
  backLabel = "Volver al portal",
  actions,
  children,
}: PublicPageShellProps) {
  return (
    <main className="public-arena">
      <div className="public-shell">
        <header className="public-topbar">
          <div className="public-wrap">
            <div className="public-topbar__inner">
              <div className="public-brand">
                <span className="public-brand__mark">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="public-kicker text-[0.66rem]">Torneo Escolar</p>
                  <p className="text-sm font-semibold text-white">Seguimiento y clasificacion</p>
                </div>
              </div>

              <nav className="public-nav">
                <Link className="public-nav__link" href="/">
                  Inicio
                </Link>
                <Link className="public-nav__link" href="/login">
                  Staff
                </Link>
                <Link className="public-nav__link" href="/admin/login">
                  Admin
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <section className="public-hero">
          <div className="public-wrap py-10 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="public-glass p-6 lg:p-8">
                <Link className="public-tag" href={backHref}>
                  <ChevronLeft className="h-4 w-4" />
                  {backLabel}
                </Link>
                <p className="public-kicker mt-8">{eyebrow}</p>
                <h1 className="public-title mt-4 text-4xl sm:text-6xl lg:text-7xl">{title}</h1>
                {description ? <p className="public-copy mt-5 max-w-3xl text-base">{description}</p> : null}
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
