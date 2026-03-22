import { describe, expect, it } from "vitest";

import { detectPwaPlatform } from "@/lib/pwa-platform";

describe("detectPwaPlatform", () => {
  it("detects Samsung Internet on Android separately from Chrome", () => {
    expect(
      detectPwaPlatform(
        "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("android-samsung");
  });

  it("detects Chrome on Android as the preferred install path", () => {
    expect(
      detectPwaPlatform(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36",
      ),
    ).toBe("android-chrome");
  });

  it("keeps iPhone Safari on the manual add-to-home-screen path", () => {
    expect(
      detectPwaPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("ios-safari");
  });
});
