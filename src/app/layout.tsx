import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";

import { PwaRegistrar } from "@/components/pwa-registrar";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { APP_VERSION } from "@/lib/app-version";
import {
  TOURNAMENT_THEME_COLOR,
  TOURNAMENT_DESCRIPTION,
  TOURNAMENT_NAME,
  TOURNAMENT_PWA_SHORT_NAME,
} from "@/lib/branding";

import "./globals.css";

const displayFont = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: TOURNAMENT_NAME,
  description: TOURNAMENT_DESCRIPTION,
  applicationName: TOURNAMENT_PWA_SHORT_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: TOURNAMENT_PWA_SHORT_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: TOURNAMENT_THEME_COLOR,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}
        data-app-version={APP_VERSION}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-green-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido
        </a>
        <PwaRegistrar appVersion={APP_VERSION} />
        <PullToRefresh />
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
