"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Menu, X } from "lucide-react";

export function MobileNavToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        className="mobile-nav-btn md:hidden"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        type="button"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <button
        aria-hidden={!open}
        className={`public-nav-backdrop ${open ? "public-nav-backdrop--open" : ""}`}
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
        type="button"
      />

      <nav className={`public-nav public-nav--mobile ${open ? "public-nav--open" : ""}`}>
        <div className="public-nav__panel">
          <div className="public-nav__mobile-head">
            <div>
              <p className="public-nav__eyebrow">Navegación</p>
              <p className="public-nav__title">Abrir secciones</p>
            </div>
            <button
              className="public-nav__close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="public-nav__stack" onClick={() => setOpen(false)}>
            {children}
          </div>

          <div className="public-nav__meta">
            <span>Portal público</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </nav>
    </>
  );
}
