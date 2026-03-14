import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Torneo Escolar 2026",
    short_name: "Torneo 2026",
    description: "Portal de clasificacion, partidos y puntuacion del torneo.",
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
