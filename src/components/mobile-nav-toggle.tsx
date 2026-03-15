"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNavToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

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
        <div onClick={() => setOpen(false)}>{children}</div>
      </nav>
    </>
  );
}
