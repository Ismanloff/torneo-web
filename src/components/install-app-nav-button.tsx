"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { OPEN_INSTALL_PROMPT_EVENT } from "@/components/pwa-registrar";

function isStandaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isSupportedMobilePlatform() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod/.test(userAgent);
}

export function InstallAppNavButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setVisible(isSupportedMobilePlatform() && !isStandaloneMode());
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
      <span>Instalar app</span>
      <Download className="h-4 w-4" />
    </button>
  );
}
