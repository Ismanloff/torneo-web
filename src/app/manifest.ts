import type { MetadataRoute } from "next";
import {
  TOURNAMENT_DESCRIPTION,
  TOURNAMENT_NAME,
  TOURNAMENT_SHORT_NAME,
} from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: TOURNAMENT_NAME,
    short_name: TOURNAMENT_SHORT_NAME,
    description: TOURNAMENT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5efe3",
    theme_color: "#171311",
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
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
