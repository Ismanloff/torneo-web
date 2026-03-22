"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { OPEN_INSTALL_PROMPT_EVENT } from "@/components/pwa-registrar";
import { detectPwaPlatform, isStandaloneMode } from "@/lib/pwa-platform";

function isSupportedMobilePlatform() {
  return detectPwaPlatform() !== "other";
}

export function InstallAppNavButton() {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("Instalar app");

  useEffect(() => {
    const updateVisibility = () => {
      const platform = detectPwaPlatform();

      setVisible(isSupportedMobilePlatform() && !isStandaloneMode());
      setLabel(
        platform === "android-samsung" || platform === "android-other"
          ? "Instalar desde Chrome"
          : "Instalar app",
      );
    };

    updateVisibility();
    const standaloneQuery = window.matchMedia?.("(display-mode: standalone)");
    standaloneQuery?.addEventListener?.("change", updateVisibility);
    window.addEventListener("appinstalled", updateVisibility);

    return () => {
      standaloneQuery?.removeEventListener?.("change", updateVisibility);
      window.removeEventListener("appinstalled", updateVisibility);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      className="public-nav__link"
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_INSTALL_PROMPT_EVENT))}
    >
      <span>{label}</span>
      <Download className="h-4 w-4" />
    </button>
  );
}
