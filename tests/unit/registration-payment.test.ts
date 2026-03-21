import { describe, expect, it } from "vitest";

import {
  REGISTRATION_PAYMENT_BASE_COPY,
  REGISTRATION_PAYMENT_EMAIL_COPY,
  REGISTRATION_PAYMENT_SUCCESS_COPY,
  TEAM_REGISTRATION_FEE_EUR,
} from "@/lib/registration-payment";
import { buildRegistrationEmailHtml, buildRegistrationEmailText } from "@/lib/registration-email-template";

describe("registration payment copy", () => {
  it("defines the approved public payment reminder", () => {
    expect(TEAM_REGISTRATION_FEE_EUR).toBe(5);
    expect(REGISTRATION_PAYMENT_BASE_COPY).toBe(
      "Para participar en el torneo, cada equipo debe abonar 5 € en efectivo el día del torneo para cubrir gastos de organización.",
    );
  });

  it("keeps the success and email reminders aligned with the same payment rules", () => {
    expect(REGISTRATION_PAYMENT_SUCCESS_COPY).toContain("5 € en efectivo");
    expect(REGISTRATION_PAYMENT_SUCCESS_COPY).toContain("el día del torneo");
    expect(REGISTRATION_PAYMENT_EMAIL_COPY).toContain("5 € en efectivo");
    expect(REGISTRATION_PAYMENT_EMAIL_COPY).toContain("el día del torneo");
  });
});

describe("registration email html", () => {
  it("includes the payment reminder in the main email body", () => {
    const html = buildRegistrationEmailHtml({
      to: "capitan@example.com",
      teamId: "team-1",
      teamName: "Las Águilas",
      categoryName: "Baloncesto Cadete",
      sport: "Baloncesto",
      ageGroup: "14-17 años",
      schoolName: "Colegio Mater",
      registrationCode: "LAS-AGUILAS-AB12",
      qrToken: "token-prueba",
      captainName: "Capitán de prueba",
    });

    expect(html).toContain("Importe de participación");
    expect(html).toContain(REGISTRATION_PAYMENT_EMAIL_COPY);
    expect(html).toContain("5 € en efectivo");
    expect(html).toContain("el día del torneo");
  });

  it("includes a plain text version with the same operational details", () => {
    const text = buildRegistrationEmailText({
      to: "capitan@example.com",
      teamId: "team-1",
      teamName: "Las Águilas",
      categoryName: "Baloncesto Cadete",
      sport: "Baloncesto",
      ageGroup: "14-17 años",
      schoolName: "Colegio Mater",
      registrationCode: "LAS-AGUILAS-AB12",
      qrToken: "token-prueba",
      captainName: "Capitán de prueba",
    });

    expect(text).toContain("Pago:");
    expect(text).toContain(REGISTRATION_PAYMENT_EMAIL_COPY);
    expect(text).toContain("Panel privado del equipo:");
    expect(text).toContain("QR oficial del equipo:");
  });
});
