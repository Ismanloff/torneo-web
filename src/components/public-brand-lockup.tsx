import Image from "next/image";
import { Trophy } from "lucide-react";

import {
  TOURNAMENT_EDITION_LABEL,
  TOURNAMENT_TAGLINE,
  TOURNAMENT_ORGANIZER_MAIN,
} from "@/lib/branding";
import { getSportiLogoPath } from "@/lib/brand-assets";

export function PublicBrandLockup() {
  const logoPath = getSportiLogoPath();

  return (
    <div className="public-brand">
      <span className={`public-brand__mark ${logoPath ? "public-brand__mark--logo" : ""}`}>
        {logoPath ? (
          <Image alt="Sporti" className="public-brand__logo" height={64} src={logoPath} width={64} />
        ) : (
          <Trophy className="h-5 w-5" />
        )}
      </span>

      <div className="public-brand__copy">
        <p className="public-brand__eyebrow">{TOURNAMENT_EDITION_LABEL}</p>
        <p className="public-brand__title">{TOURNAMENT_ORGANIZER_MAIN}</p>
        <p className="public-brand__subtitle">{TOURNAMENT_TAGLINE}</p>
      </div>
    </div>
  );
}
