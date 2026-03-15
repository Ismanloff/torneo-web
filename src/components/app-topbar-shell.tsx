"use client";

import { useEffect, useState } from "react";

export function AppTopbarShell({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const scrollingDown = currentY > lastY;
      const shouldHide = scrollingDown && currentY > 56;

      setHidden(shouldHide);
      lastY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return <header className={`app-topbar ${hidden ? "app-topbar--hidden" : ""}`}>{children}</header>;
}
