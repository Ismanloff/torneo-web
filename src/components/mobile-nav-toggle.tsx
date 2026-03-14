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
        aria-label={open ? "Cerrar menu" : "Abrir menu"}
        type="button"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <nav className={`public-nav ${open ? "public-nav--open" : ""}`}>
        <div onClick={() => setOpen(false)}>{children}</div>
      </nav>
    </>
  );
}
