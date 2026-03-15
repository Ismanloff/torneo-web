import { Resend } from "resend";
import QRCode from "qrcode";

import {
  TOURNAMENT_EVENT_DATE_LABEL,
  TOURNAMENT_EVENT_START_LABEL,
  TOURNAMENT_EVENT_VENUE,
  TOURNAMENT_EVENT_WINDOW_LABEL,
  TOURNAMENT_NAME,
} from "@/lib/branding";
import { buildPublicQrTargetUrl, buildQrShareUrl } from "@/lib/utils";

type RegistrationEmailInput = {
  to: string;
  teamId: string;
  teamName: string;
  categoryName: string;
  sport: string;
  ageGroup: string;
  schoolName: string | null;
  registrationCode: string;
  qrToken: string;
  captainName: string;
};

type RegistrationEmailResult =
  | { status: "sent" }
  | { status: "skipped"; error: string }
  | { status: "failed"; error: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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
    const teamPanelUrl = buildPublicQrTargetUrl({
      resource_id: input.teamId,
      resource_type: "team",
      token: input.qrToken,
    });
    const qrAccessUrl = buildQrShareUrl(input.qrToken);
    const qrPng = await QRCode.toBuffer(qrAccessUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: "#08131e",
        light: "#f5efe3",
      },
    });

    const schoolName = input.schoolName ?? (input.ageGroup === "14-17 años" ? "Colegio Mater" : "Colegio Fátima");

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inscripción confirmada</title>
</head>
<body style="margin:0;padding:0;background:#f2ede7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#08131e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede7;padding:26px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#07111d;border-radius:30px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);box-shadow:0 24px 80px rgba(2,6,23,0.24);">
          <tr>
            <td style="padding:36px 34px 30px;background:
              radial-gradient(circle at top right, rgba(132,239,83,0.28), transparent 32%),
              radial-gradient(circle at bottom left, rgba(66,193,255,0.18), transparent 25%),
              linear-gradient(180deg,#07111d 0%,#0c1b28 100%);
              color:#f8fafc;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:18px;">
                    <span style="display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid rgba(132,239,83,0.22);background:rgba(132,239,83,0.12);font-size:12px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:#d9ffc8;">
                      Registro confirmado
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h1 style="margin:0;font-size:44px;line-height:0.96;letter-spacing:0.02em;color:#f8fafc;">${escapeHtml(TOURNAMENT_NAME)}</h1>
                    <p style="margin:16px 0 0;font-size:18px;line-height:1.6;color:#a8b7d2;">
                      18 de abril a las ${escapeHtml(TOURNAMENT_EVENT_START_LABEL)} · ${escapeHtml(TOURNAMENT_EVENT_VENUE)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 34px 10px;background:#07111d;color:#f8fafc;">
              <p style="margin:0 0 14px;font-size:17px;line-height:1.6;color:#f8fafc;">
                Hola <strong>${escapeHtml(input.captainName)}</strong>,
              </p>
              <p style="margin:0;font-size:16px;line-height:1.85;color:#a8b7d2;">
                Tu equipo ya tiene plaza en el torneo. Te dejamos su acceso privado, el QR oficial para el check-in y toda la logística del día para que no dependas de ningún otro mensaje.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 34px 0;background:#07111d;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.03));">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 0 18px;font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#9fb3d9;">Equipo inscrito</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 8px;font-size:34px;line-height:1;color:#f8fafc;font-weight:700;">${escapeHtml(input.teamName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 22px;font-size:15px;line-height:1.7;color:#a8b7d2;">${escapeHtml(input.sport)} · ${escapeHtml(input.categoryName)} · ${escapeHtml(input.ageGroup)}</td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#8fa1c2;width:148px;">Código de registro</td>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);">
                          <span style="display:inline-block;padding:8px 14px;border-radius:12px;background:linear-gradient(135deg,#b8ff79 0%,#54d12b 100%);color:#051006;font-size:15px;font-weight:800;letter-spacing:0.14em;">${escapeHtml(input.registrationCode)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#8fa1c2;">Colegio asignado</td>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;color:#f8fafc;">${escapeHtml(schoolName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#8fa1c2;">Horario del torneo</td>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;color:#f8fafc;">${escapeHtml(TOURNAMENT_EVENT_DATE_LABEL)} · ${escapeHtml(TOURNAMENT_EVENT_WINDOW_LABEL)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#8fa1c2;">Lugar</td>
                        <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;color:#f8fafc;">${escapeHtml(TOURNAMENT_EVENT_VENUE)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 34px 0;background:#07111d;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.03));">
                <tr>
                  <td style="padding:24px;" align="center">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#9fb3d9;">QR oficial del equipo</p>
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#a8b7d2;">
                      Este es el QR que la organización escaneará el día del torneo para validar la llegada del equipo y habilitar su entrada a pista.
                    </p>
                    <div style="display:inline-block;padding:14px;border-radius:24px;background:#f5efe3;">
                      <img src="cid:team-qr" alt="Código QR del equipo" width="220" height="220" style="display:block;width:220px;height:220px;border:0;outline:none;text-decoration:none;" />
                    </div>
                    <p style="margin:18px auto 0;max-width:420px;font-size:13px;line-height:1.8;color:#8fa1c2;">
                      Si abres este correo desde el móvil, puedes enseñar el QR directamente desde aquí. También puedes usar tu código de registro si fuera necesario.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 34px 0;background:#07111d;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(132,239,83,0.14);border-radius:22px;background:linear-gradient(180deg,rgba(132,239,83,0.08),rgba(255,255,255,0.02));">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#cbffb8;">Tu panel privado</p>
                    <p style="margin:14px 0 0;font-size:16px;line-height:1.8;color:#f8fafc;">
                      Este enlace es único para tu equipo. Desde ahí podrás revisar tu inscripción, el colegio asignado y el horario del torneo sin depender del código público.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                      <tr>
                        <td align="center" style="border-radius:999px;background:linear-gradient(135deg,#b8ff79 0%,#54d12b 100%);">
                          <a href="${escapeHtml(teamPanelUrl)}" style="display:inline-block;padding:15px 28px;border-radius:999px;font-size:14px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#051006;text-decoration:none;">
                            Abrir panel de mi equipo
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:12px;line-height:1.8;color:#8fa1c2;word-break:break-all;">
                      Acceso privado: ${escapeHtml(teamPanelUrl)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 34px 34px;background:#07111d;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(111,192,255,0.16);border-radius:22px;background:rgba(87,171,245,0.08);">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#9fd5ff;">Plan del día</p>
                    <ul style="margin:14px 0 0;padding:0 0 0 18px;color:#cdd7ea;font-size:15px;line-height:1.9;">
                      <li>Presentación general: ${escapeHtml(TOURNAMENT_EVENT_DATE_LABEL)} a las ${escapeHtml(TOURNAMENT_EVENT_START_LABEL)}.</li>
                      <li>Sede: ${escapeHtml(TOURNAMENT_EVENT_VENUE)}.</li>
                      <li>Ventana operativa del torneo: ${escapeHtml(TOURNAMENT_EVENT_WINDOW_LABEL)}.</li>
                      <li>Asignación por inscripción: ${escapeHtml(schoolName)}.</li>
                      <li>El QR del correo se escaneará en acreditación para validar al equipo antes de jugar.</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: input.to,
      subject: `Inscripción confirmada: ${input.teamName} · ${TOURNAMENT_NAME}`,
      html,
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
