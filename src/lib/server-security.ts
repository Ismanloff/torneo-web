import "server-only";

import {
  SAME_ORIGIN_INTENT_HEADER,
  SAME_ORIGIN_INTENT_VALUE,
} from "@/lib/security";

const TRUSTED_FETCH_SITES = new Set(["same-origin", "none"]);

export function shouldUseSecureCookies() {
  const configured = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();

  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export function isTrustedMutationRequest(request: Request) {
  if (
    request.headers.get(SAME_ORIGIN_INTENT_HEADER) !==
    SAME_ORIGIN_INTENT_VALUE
  ) {
    return false;
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");

  if (origin) {
    return origin === requestUrl.origin;
  }

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      return new URL(referer).origin === requestUrl.origin;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite ? TRUSTED_FETCH_SITES.has(fetchSite) : false;
}
