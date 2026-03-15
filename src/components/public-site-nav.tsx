import Link from "next/link";

import { MobileNavToggle } from "@/components/mobile-nav-toggle";

const NAV_ITEMS = [
  { href: "/#clasificacion", label: "Clasificación" },
  { href: "/#partidos", label: "Partidos" },
  { href: "/#cruces", label: "Cruces" },
  { href: "/inscripcion", label: "Inscripción" },
  { href: "/login", label: "Staff" },
];

export function PublicSiteNav() {
  return (
    <>
      <nav className="public-nav public-nav--desktop" aria-label="Navegación pública">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} className="public-nav__link" href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <MobileNavToggle>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} className="public-nav__link" href={item.href}>
            {item.label}
          </Link>
        ))}
      </MobileNavToggle>
    </>
  );
}
