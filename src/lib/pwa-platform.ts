"use client";

export type PwaPlatform =
  | "ios-safari"
  | "ios-other"
  | "android-chrome"
  | "android-samsung"
  | "android-other"
  | "other";

export function detectPwaPlatform(userAgent = window.navigator.userAgent): PwaPlatform {
  const normalizedUserAgent = userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(normalizedUserAgent);
  const isAndroid = /android/.test(normalizedUserAgent);
  const isSamsungInternet = /samsungbrowser/.test(normalizedUserAgent);
  const isSafari =
    /safari/.test(normalizedUserAgent) &&
    !/crios|fxios|edgios|opr\//.test(normalizedUserAgent);
  const isChromeAndroid =
    isAndroid &&
    /chrome\//.test(normalizedUserAgent) &&
    !/edg(a|ios)?\/|opr\/|brave|samsungbrowser/.test(normalizedUserAgent);

  if (isIOS && isSafari) {
    return "ios-safari";
  }

  if (isIOS) {
    return "ios-other";
  }

  if (isChromeAndroid) {
    return "android-chrome";
  }

  if (isSamsungInternet) {
    return "android-samsung";
  }

  if (isAndroid) {
    return "android-other";
  }

  return "other";
}

export function isStandaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}
