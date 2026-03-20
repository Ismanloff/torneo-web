import Link from "next/link";

import { PublicAgeGroupsSidebarCard } from "@/components/public-age-groups";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";

const NAV_ITEMS = [
  { href: "/#clasificacion", label: "Clasificación" },
  { href: "/#partidos", label: "Partidos" },
  { href: "/#cruces", label: "Cuadro" },
  { href: "/#edades-grupos", label: "Edades y grupos" },
  { href: "/inscripcion", label: "Inscribir equipo" },
  { href: "/login", label: "Zona staff" },
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

      <MobileNavToggle footer={<PublicAgeGroupsSidebarCard />}>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} className="public-nav__link" href={item.href}>
            {item.label}
          </Link>
        ))}
      </MobileNavToggle>
    </>
  );
}
