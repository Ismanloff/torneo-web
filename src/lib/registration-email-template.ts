import {
  TOURNAMENT_EVENT_DATE_LABEL,
  TOURNAMENT_EVENT_START_LABEL,
  TOURNAMENT_EVENT_VENUE,
  TOURNAMENT_EVENT_WINDOW_LABEL,
  TOURNAMENT_NAME,
} from "@/lib/branding";
import { REGISTRATION_PAYMENT_EMAIL_COPY } from "@/lib/registration-payment";
import { buildPublicQrTargetUrl, buildQrShareUrl } from "@/lib/utils";

export type RegistrationEmailInput = {
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveSchoolName(input: RegistrationEmailInput) {
  return input.schoolName ?? (input.ageGroup === "14-17 años" ? "Colegio Mater" : "Colegio Fátima");
}

export function buildRegistrationEmailText(input: RegistrationEmailInput) {
  const schoolName = resolveSchoolName(input);
  const teamPanelUrl = buildPublicQrTargetUrl({
    resource_id: input.teamId,
    resource_type: "team",
    token: input.qrToken,
  });
  const qrAccessUrl = buildQrShareUrl(input.qrToken);

  return [
    `${TOURNAMENT_NAME}`,
    "",
    `Hola ${input.captainName},`,
    "",
    "Tu equipo ya tiene plaza en el torneo.",
    "",
    `Equipo: ${input.teamName}`,
    `Deporte: ${input.sport}`,
    `Categoría: ${input.categoryName}`,
    `Edad: ${input.ageGroup}`,
    `Colegio asignado: ${schoolName}`,
    `Código de registro: ${input.registrationCode}`,
    `Horario del torneo: ${TOURNAMENT_EVENT_DATE_LABEL} · ${TOURNAMENT_EVENT_WINDOW_LABEL}`,
    `Lugar: ${TOURNAMENT_EVENT_VENUE}`,
    "",
    `Pago: ${REGISTRATION_PAYMENT_EMAIL_COPY}`,
    "",
    "Panel privado del equipo:",
    teamPanelUrl,
    "",
    "QR oficial del equipo:",
    qrAccessUrl,
    "",
    "Plan del día:",
    `- Presentación general: ${TOURNAMENT_EVENT_DATE_LABEL} a las ${TOURNAMENT_EVENT_START_LABEL}.`,
    `- Sede: ${TOURNAMENT_EVENT_VENUE}.`,
    `- Ventana operativa: ${TOURNAMENT_EVENT_WINDOW_LABEL}.`,
    `- El QR del correo se escaneará en acreditación antes de jugar.`,
  ].join("\n");
}

export function buildRegistrationEmailHtml(input: RegistrationEmailInput) {
  const schoolName = resolveSchoolName(input);
  const teamPanelUrl = buildPublicQrTargetUrl({
    resource_id: input.teamId,
    resource_type: "team",
    token: input.qrToken,
  });

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inscripción confirmada</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f2;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#142018;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f2;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d9dfd2;">
          <tr>
            <td style="padding:30px 28px 18px;background:#102016;color:#ffffff;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#d9edc6;">
                Inscripción confirmada
              </p>
              <h1 style="margin:0;font-size:32px;line-height:1.05;color:#ffffff;">${escapeHtml(TOURNAMENT_NAME)}</h1>
              <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#d3dfd0;">
                ${escapeHtml(TOURNAMENT_EVENT_DATE_LABEL)} · ${escapeHtml(TOURNAMENT_EVENT_START_LABEL)} · ${escapeHtml(TOURNAMENT_EVENT_VENUE)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 28px 8px;background:#ffffff;color:#142018;">
              <p style="margin:0 0 14px;font-size:17px;line-height:1.6;color:#142018;">
                Hola <strong>${escapeHtml(input.captainName)}</strong>,
              </p>
              <p style="margin:0;font-size:16px;line-height:1.8;color:#435247;">
                Tu equipo ya tiene plaza en el torneo. Este correo incluye el acceso privado del equipo, el QR oficial para el check-in y la información práctica del día.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 0;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9dfd2;border-radius:16px;background:#fbfcf8;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#5b6f60;">Equipo inscrito</p>
                    <p style="margin:0 0 8px;font-size:28px;line-height:1.1;color:#142018;font-weight:700;">${escapeHtml(input.teamName)}</p>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#435247;">${escapeHtml(input.sport)} · ${escapeHtml(input.categoryName)} · ${escapeHtml(input.ageGroup)}</p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;font-size:13px;color:#5b6f60;width:150px;">Código de registro</td>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;">
                          <span style="display:inline-block;padding:7px 12px;border-radius:10px;background:#dff0ce;color:#142018;font-size:14px;font-weight:800;letter-spacing:0.12em;">${escapeHtml(input.registrationCode)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;font-size:13px;color:#5b6f60;">Colegio asignado</td>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;font-size:15px;color:#142018;">${escapeHtml(schoolName)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;font-size:13px;color:#5b6f60;">Horario del torneo</td>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;font-size:15px;color:#142018;">${escapeHtml(TOURNAMENT_EVENT_DATE_LABEL)} · ${escapeHtml(TOURNAMENT_EVENT_WINDOW_LABEL)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;font-size:13px;color:#5b6f60;">Lugar</td>
                        <td style="padding:12px 0;border-top:1px solid #d9dfd2;font-size:15px;color:#142018;">${escapeHtml(TOURNAMENT_EVENT_VENUE)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 0;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d2e4bf;border-radius:16px;background:#f5faed;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#51713e;">Importe de participación</p>
                    <p style="margin:14px 0 0;font-size:16px;line-height:1.8;color:#142018;">
                      ${escapeHtml(REGISTRATION_PAYMENT_EMAIL_COPY)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 0;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9dfd2;border-radius:16px;background:#fbfcf8;">
                <tr>
                  <td style="padding:24px;" align="center">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#5b6f60;">QR oficial del equipo</p>
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#435247;">
                      Este es el QR que la organización escaneará el día del torneo para validar la llegada del equipo y habilitar su entrada a pista.
                    </p>
                    <div style="display:inline-block;padding:12px;border-radius:18px;background:#ffffff;border:1px solid #d9dfd2;">
                      <img src="cid:team-qr" alt="Código QR del equipo" width="180" height="180" style="display:block;width:180px;height:180px;border:0;outline:none;text-decoration:none;" />
                    </div>
                    <p style="margin:18px auto 0;max-width:420px;font-size:13px;line-height:1.8;color:#5b6f60;">
                      Si abres este correo desde el móvil, puedes enseñar el QR directamente desde aquí. También puedes usar tu código de registro si fuera necesario.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 0;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9dfd2;border-radius:16px;background:#ffffff;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#5b6f60;">Tu panel privado</p>
                    <p style="margin:14px 0 0;font-size:16px;line-height:1.8;color:#142018;">
                      Este enlace es único para tu equipo. Desde ahí podrás revisar tu inscripción, el colegio asignado y el horario del torneo sin depender del código público.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                      <tr>
                        <td align="center" style="border-radius:999px;background:#1d4d22;">
                          <a href="${escapeHtml(teamPanelUrl)}" style="display:inline-block;padding:14px 24px;border-radius:999px;font-size:14px;font-weight:700;letter-spacing:0.06em;color:#ffffff;text-decoration:none;">
                            Abrir panel de mi equipo
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:12px;line-height:1.8;color:#5b6f60;word-break:break-all;">
                      Acceso privado: ${escapeHtml(teamPanelUrl)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 28px;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d9dfd2;border-radius:16px;background:#fbfcf8;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#5b6f60;">Plan del día</p>
                    <ul style="margin:14px 0 0;padding:0 0 0 18px;color:#435247;font-size:15px;line-height:1.9;">
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
}
