import { describe, expect, it } from "vitest";

import {
  getSameOriginMutationHeaders,
  maskEmailAddress,
  sanitizeRelativePath,
} from "@/lib/security";
import { buildPublicQrTargetPath } from "@/lib/utils";

describe("sanitizeRelativePath", () => {
  it("allows same-site relative paths", () => {
    expect(
      sanitizeRelativePath("/app/admin?tab=staff#pin", "/app/admin"),
    ).toBe("/app/admin?tab=staff#pin");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(sanitizeRelativePath("https://evil.example", "/app/admin")).toBe(
      "/app/admin",
    );
    expect(sanitizeRelativePath("//evil.example", "/app/admin")).toBe(
      "/app/admin",
    );
  });

  it("rejects malformed local paths", () => {
    expect(sanitizeRelativePath("/\\evil", "/app/admin")).toBe("/app/admin");
    expect(sanitizeRelativePath(null, "/app/admin")).toBe("/app/admin");
  });
});

describe("maskEmailAddress", () => {
  it("masks captain emails before rendering them on shared surfaces", () => {
    expect(maskEmailAddress("capitan@colegio.es")).toBe("ca***@co***.es");
  });

  it("returns a neutral label when the input is absent", () => {
    expect(maskEmailAddress("")).toBe("correo protegido");
  });
});

describe("public QR paths", () => {
  it("builds clean team tracking paths without leaking the token", () => {
    expect(
      buildPublicQrTargetPath({
        resource_id: "team-1",
        resource_type: "team",
      }),
    ).toBe("/seguimiento/equipo/team-1");
  });

  it("keeps match scope in the public path while omitting the token", () => {
    expect(
      buildPublicQrTargetPath({
        resource_id: "match-1",
        resource_type: "category_match",
      }),
    ).toBe("/seguimiento/partido/match-1?scope=category_match");
  });
});

describe("same-origin mutation headers", () => {
  it("uses a stable custom header for JSON mutations", () => {
    expect(getSameOriginMutationHeaders()).toEqual({
      "x-torneo-intent": "same-origin-json",
    });
  });
});
