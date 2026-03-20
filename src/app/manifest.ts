import type { MetadataRoute } from "next";
import {
  TOURNAMENT_BACKGROUND_COLOR,
  TOURNAMENT_DESCRIPTION,
  TOURNAMENT_PWA_NAME,
  TOURNAMENT_PWA_SHORT_NAME,
  TOURNAMENT_THEME_COLOR,
} from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: TOURNAMENT_PWA_NAME,
    short_name: TOURNAMENT_PWA_SHORT_NAME,
    description: TOURNAMENT_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: TOURNAMENT_BACKGROUND_COLOR,
    theme_color: TOURNAMENT_THEME_COLOR,
    lang: "es-ES",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-home-mobile.png",
        sizes: "540x1200",
        type: "image/png",
        form_factor: "narrow",
        label: "Portada pública del torneo",
      },
      {
        src: "/screenshot-home-desktop.png",
        sizes: "1440x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Vista pública del torneo",
      },
    ],
  };
}
