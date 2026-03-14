import { Resend } from "resend";
import QRCode from "qrcode";
import { buildQrShareUrl, TOURNAMENT_PUBLIC_URL } from "@/lib/utils";

const resend = new Resend(process.env.RESEND_API_KEY);

type RegistrationEmailInput = {
  to: string;
  teamName: string;
  categoryName: string;
  sport: string;
  registrationCode: string;
  qrToken: string;
  captainName: string;
};

export async function sendRegistrationEmail(
  input: RegistrationEmailInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const qrDataUrl = await QRCode.toDataURL(buildQrShareUrl(input.qrToken), {
      width: 400,
      margin: 2,
      color: { dark: "#171311", light: "#FFF8EC" },
    });

    const trackingUrl = `${TOURNAMENT_PUBLIC_URL}/equipo/${encodeURIComponent(input.registrationCode)}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inscripcion confirmada</title>
</head>
<body style="margin:0;padding:0;background-color:#fdf6f0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fdf6f0;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e85d26,#f59e0b);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Torneo Escolar</h1>
              <p style="margin:8px 0 0;color:#fff3e0;font-size:14px;">Inscripcion confirmada</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">
                Hola <strong>${input.captainName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
                La inscripcion de tu equipo ha sido registrada correctamente. A continuacion encontraras los datos de tu registro.
              </p>

              <!-- Details card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8f1;border:1px solid #fde0c2;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#888;font-size:13px;width:140px;">Equipo</td>
                        <td style="padding:6px 0;color:#333;font-size:15px;font-weight:600;">${input.teamName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#888;font-size:13px;">Categoria</td>
                        <td style="padding:6px 0;color:#333;font-size:15px;">${input.categoryName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#888;font-size:13px;">Deporte</td>
                        <td style="padding:6px 0;color:#333;font-size:15px;">${input.sport}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#888;font-size:13px;">Codigo de registro</td>
                        <td style="padding:6px 0;">
                          <span style="display:inline-block;background-color:#e85d26;color:#fff;padding:4px 12px;border-radius:4px;font-size:15px;font-weight:700;letter-spacing:1px;">${input.registrationCode}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 12px;color:#333;font-size:15px;font-weight:600;">Tu codigo QR</p>
                    <img src="${qrDataUrl}" alt="Codigo QR del equipo" width="200" height="200" style="display:block;border:1px solid #eee;border-radius:8px;" />
                    <p style="margin:12px 0 0;color:#888;font-size:12px;">Presenta este QR el dia del torneo para agilizar el check-in.</p>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;color:#0c4a6e;font-size:15px;font-weight:600;">Instrucciones para el dia del torneo</p>
                    <ul style="margin:0;padding:0 0 0 20px;color:#333;font-size:14px;line-height:1.7;">
                      <li>Presenta el codigo QR o tu codigo de registro en la mesa de acreditacion.</li>
                      <li>Llega al menos 30 minutos antes de tu primer partido.</li>
                      <li>Todos los jugadores deben estar presentes para el check-in.</li>
                      <li>Guarda este correo como comprobante de inscripcion.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <a href="${trackingUrl}" style="display:inline-block;background-color:#e85d26;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;">Seguir estado de mi equipo</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fdf6f0;padding:20px 24px;text-align:center;border-top:1px solid #fde0c2;">
              <p style="margin:0;color:#999;font-size:12px;">
                Este correo fue enviado automaticamente por el sistema de inscripciones del Torneo Escolar.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "Torneo Escolar <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: input.to,
      subject: `Inscripcion confirmada: ${input.teamName} — Torneo Escolar`,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    return { success: false, error: message };
  }
}
