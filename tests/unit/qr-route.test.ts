import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}), { virtual: true });

const setPublicAccessStateMock = vi.fn();
const getAdminAccessContextMock = vi.fn();
const getQrTargetByTokenMock = vi.fn();
const touchQrTokenMock = vi.fn();

vi.mock("@/lib/flash-state", () => ({
  setPublicAccessState: setPublicAccessStateMock,
}));

vi.mock("@/lib/admin-auth", () => ({
  getAdminAccessContext: getAdminAccessContextMock,
}));

vi.mock("@/lib/supabase/queries", () => ({
  getQrTargetByToken: getQrTargetByTokenMock,
  touchQrToken: touchQrTokenMock,
}));

beforeEach(() => {
  setPublicAccessStateMock.mockReset();
  getAdminAccessContextMock.mockReset();
  getQrTargetByTokenMock.mockReset();
  touchQrTokenMock.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe("/q/[token] route", () => {
  it("redirects invalid tokens to restricted login", async () => {
    getQrTargetByTokenMock.mockResolvedValue(null);

    const { GET } = await import("@/app/q/[token]/route");
    const response = await GET(new Request("https://torneo.eloos.es/q/invalido"), {
      params: Promise.resolve({ token: "invalido" }),
    });

    expect(response.headers.get("location")).toBe(
      "https://torneo.eloos.es/login?error=restricted",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(touchQrTokenMock).not.toHaveBeenCalled();
  });

  it("redirects public team scans to the public team tracking page", async () => {
    getQrTargetByTokenMock.mockResolvedValue({
      resource_id: "team-1",
      resource_type: "team",
    });
    getAdminAccessContextMock.mockResolvedValue(null);

    const { GET } = await import("@/app/q/[token]/route");
    const response = await GET(new Request("https://torneo.eloos.es/q/token-publico"), {
      params: Promise.resolve({ token: "token-publico" }),
    });

    expect(touchQrTokenMock).toHaveBeenCalledWith("token-publico");
    expect(setPublicAccessStateMock).toHaveBeenCalledWith({
      resourceId: "team-1",
      resourceType: "team",
      token: "token-publico",
    });
    expect(response.headers.get("location")).toBe(
      "https://torneo.eloos.es/seguimiento/equipo/team-1",
    );
  });

  it("redirects admin scans to the internal team page with scan params", async () => {
    getQrTargetByTokenMock.mockResolvedValue({
      resource_id: "team-1",
      resource_type: "team",
    });
    getAdminAccessContextMock.mockResolvedValue({
      mode: "legacy",
      role: "superadmin",
      profile: null,
      authUserId: null,
    });

    const { GET } = await import("@/app/q/[token]/route");
    const response = await GET(new Request("https://torneo.eloos.es/q/token-admin"), {
      params: Promise.resolve({ token: "token-admin" }),
    });

    expect(setPublicAccessStateMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://torneo.eloos.es/app/equipo/team-1?entry=1&from=scan",
    );
  });

  it("preserves match scope when redirecting an internal match scan", async () => {
    getQrTargetByTokenMock.mockResolvedValue({
      resource_id: "match-1",
      resource_type: "category_match",
    });
    getAdminAccessContextMock.mockResolvedValue({
      mode: "legacy",
      role: "superadmin",
      profile: null,
      authUserId: null,
    });

    const { GET } = await import("@/app/q/[token]/route");
    const response = await GET(new Request("https://torneo.eloos.es/q/token-match"), {
      params: Promise.resolve({ token: "token-match" }),
    });

    expect(response.headers.get("location")).toBe(
      "https://torneo.eloos.es/app/partido/match-1?scope=category_match&from=scan",
    );
  });
});
