export const SAME_ORIGIN_INTENT_HEADER = "x-torneo-intent";
export const SAME_ORIGIN_INTENT_VALUE = "same-origin-json";

export function getSameOriginMutationHeaders() {
  return {
    [SAME_ORIGIN_INTENT_HEADER]: SAME_ORIGIN_INTENT_VALUE,
  };
}

export function sanitizeRelativePath(
  pathname: string | undefined | null,
  fallback: string,
) {
  if (!pathname) {
    return fallback;
  }

  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\") ||
    pathname.includes("\u0000")
  ) {
    return fallback;
  }

  try {
    const normalized = new URL(pathname, "https://torneo.local");

    if (normalized.origin !== "https://torneo.local") {
      return fallback;
    }

    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  } catch {
    return fallback;
  }
}

export function maskEmailAddress(email: string | null | undefined) {
  if (!email) {
    return "correo protegido";
  }

  const [localPart, domainPart] = email.trim().split("@");

  if (!localPart || !domainPart) {
    return "correo protegido";
  }

  const domainSegments = domainPart.split(".");
  const domainName = domainSegments.shift() ?? "";
  const suffix = domainSegments.length ? `.${domainSegments.join(".")}` : "";
  const maskedLocal =
    localPart.length <= 2 ? `${localPart.slice(0, 1)}***` : `${localPart.slice(0, 2)}***`;
  const maskedDomain =
    domainName.length <= 2 ? `${domainName.slice(0, 1)}***` : `${domainName.slice(0, 2)}***`;

  return `${maskedLocal}@${maskedDomain}${suffix}`;
}
