"use client";

import Link from "next/link";
import { ClipboardList, LayoutDashboard, QrCode, Shield, Users } from "lucide-react";
import { usePathname } from "next/navigation";

import type { StaffRole } from "@/lib/types";

const ITEMS = [
  { href: "/app", label: "Inicio", icon: LayoutDashboard },
  { href: "/app/scan", label: "Escáner", icon: QrCode },
  { href: "/app/partidos", label: "Partidos", icon: ClipboardList },
  { href: "/app/equipos", label: "Equipos", icon: Users },
  { href: "/app/admin", label: "Gestión", icon: Shield, adminOnly: true },
];

export function AppShellNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const visibleItems = ITEMS.filter((item) => !item.adminOnly || role === "admin");
  const columns =
    visibleItems.length === 5 ? "grid-cols-5" : visibleItems.length === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <nav className="app-nav lg:max-w-md lg:rounded-t-2xl" aria-label="Navegación principal">
      <div className={`app-nav__grid ${columns}`}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/app"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              className={`app-nav__item ${active ? "app-nav__item--active" : ""}`}
              href={item.href}
              aria-label={item.label}
              {...(active ? { "aria-current": "page" as const } : {})}
            >
              <Icon className="h-[1.1rem] w-[1.1rem]" />
              <span className="app-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
