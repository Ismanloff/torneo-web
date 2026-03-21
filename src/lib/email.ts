import "server-only";

import { Resend } from "resend";
import QRCode from "qrcode";

import { TOURNAMENT_NAME } from "@/lib/branding";
import {
  buildRegistrationEmailHtml,
  buildRegistrationEmailText,
  type RegistrationEmailInput,
} from "@/lib/registration-email-template";
import { buildQrShareUrl } from "@/lib/utils";

type RegistrationEmailResult =
  | { status: "sent" }
  | { status: "skipped"; error: string }
  | { status: "failed"; error: string };

export async function sendRegistrationEmail(
  input: RegistrationEmailInput,
): Promise<RegistrationEmailResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const fromAddress = process.env.RESEND_FROM_EMAIL?.trim();

    if (!apiKey) {
      return {
        status: "skipped",
        error: "RESEND_API_KEY no configurada. La inscripción se guardó sin enviar correo.",
      };
    }

    if (!fromAddress) {
      return {
        status: "skipped",
        error:
          "RESEND_FROM_EMAIL no configurada. Para enviar a direcciones externas necesitas un remitente de un dominio verificado en Resend.",
      };
    }

    const resend = new Resend(apiKey);
    const qrAccessUrl = buildQrShareUrl(input.qrToken);
    const qrPng = await QRCode.toBuffer(qrAccessUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: "#08131e",
        light: "#f5efe3",
      },
    });
    const html = buildRegistrationEmailHtml(input);
    const text = buildRegistrationEmailText(input);

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: input.to,
      replyTo: fromAddress,
      subject: `Inscripción confirmada: ${input.teamName} · ${TOURNAMENT_NAME}`,
      html,
      text,
      attachments: [
        {
          filename: `qr-${input.registrationCode.toLowerCase()}.png`,
          content: qrPng,
          contentType: "image/png",
          contentId: "team-qr",
        },
      ],
    });

    if (error) {
      return { status: "failed", error: error.message };
    }

    return { status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    return { status: "failed", error: message };
  }
}
