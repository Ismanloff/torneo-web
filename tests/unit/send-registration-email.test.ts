import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}), { virtual: true });

const sendMock = vi.fn();
const toBufferMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(
    class MockResend {
      emails = {
        send: sendMock,
      };
    },
  ),
}));

vi.mock("qrcode", () => ({
  default: {
    toBuffer: toBufferMock,
  },
}));

const baseInput = {
  to: "capitan@example.com",
  teamId: "team-1",
  teamName: "Las Aguilas",
  categoryName: "Baloncesto Cadete",
  sport: "Baloncesto",
  ageGroup: "14-17 años",
  schoolName: "Colegio Mater",
  registrationCode: "LAS-AGUILAS-AB12",
  qrToken: "token-prueba",
  captainName: "Capitan de prueba",
};

beforeEach(() => {
  sendMock.mockReset();
  toBufferMock.mockReset();
  toBufferMock.mockResolvedValue(Buffer.from("qr-image"));
  sendMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("sendRegistrationEmail", () => {
  it("skips when RESEND_API_KEY is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "torneo@example.com");

    const { sendRegistrationEmail } = await import("@/lib/email");
    const result = await sendRegistrationEmail(baseInput);

    expect(result).toEqual({
      status: "skipped",
      error: "RESEND_API_KEY no configurada. La inscripción se guardó sin enviar correo.",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips when RESEND_FROM_EMAIL is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "");

    const { sendRegistrationEmail } = await import("@/lib/email");
    const result = await sendRegistrationEmail(baseInput);

    expect(result).toEqual({
      status: "skipped",
      error:
        "RESEND_FROM_EMAIL no configurada. Para enviar a direcciones externas necesitas un remitente de un dominio verificado en Resend.",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends the email with QR attachment and payment reminder", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "torneo@example.com");

    const { sendRegistrationEmail } = await import("@/lib/email");
    const result = await sendRegistrationEmail(baseInput);

    expect(result).toEqual({ status: "sent" });
    expect(toBufferMock).toHaveBeenCalledWith(
      expect.stringContaining("/q/token-prueba"),
      expect.objectContaining({ width: 320 }),
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "torneo@example.com",
        to: "capitan@example.com",
        replyTo: "torneo@example.com",
        subject: expect.stringContaining("Las Aguilas"),
        html: expect.stringContaining("5 € en efectivo el día del torneo"),
        text: expect.stringContaining("Pago:"),
        attachments: [
          expect.objectContaining({
            filename: "qr-las-aguilas-ab12.png",
            contentType: "image/png",
            contentId: "team-qr",
          }),
        ],
      }),
    );
  });

  it("surfaces resend failures", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "torneo@example.com");
    sendMock.mockResolvedValue({ error: { message: "SMTP down" } });

    const { sendRegistrationEmail } = await import("@/lib/email");
    const result = await sendRegistrationEmail(baseInput);

    expect(result).toEqual({ status: "failed", error: "SMTP down" });
  });
});
