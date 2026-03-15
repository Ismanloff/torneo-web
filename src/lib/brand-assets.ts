import { existsSync } from "node:fs";
import { join } from "node:path";

const LOGO_CANDIDATES = [
  "Sporti.png",
  "Sporti.webp",
  "Sporti.jpg",
  "Sporti.jpeg",
  "Sporti.svg",
  "sporti.png",
  "sporti.webp",
  "sporti.jpg",
  "sporti.jpeg",
  "sporti.svg",
];

export function getSportiLogoPath() {
  for (const candidate of LOGO_CANDIDATES) {
    if (existsSync(join(process.cwd(), "public", candidate))) {
      return `/${candidate}`;
    }
  }

  return null;
}
